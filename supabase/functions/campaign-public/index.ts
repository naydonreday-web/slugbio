import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

type CampaignAction = { action: "track"; campaignId: string; metric: "view" | "click" | "share" };

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashRateKey(ip: string, scope: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${scope}:${ip}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requestIp(request: Request) {
  // Only use the address Cloudflare sets at its edge; never trust caller-controlled X-Forwarded-For.
  const address = request.headers.get("cf-connecting-ip")?.trim();
  return address && address.length <= 100 && /^[0-9a-fA-F:.]+$/.test(address) ? address : null;
}

function isAction(value: unknown): value is CampaignAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  if (typeof action.campaignId !== "string" || action.campaignId.length < 3 || action.campaignId.length > 80)
    return false;
  return action.action === "track" &&
    (action.metric === "view" || action.metric === "click" || action.metric === "share");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (Number(request.headers.get("content-length") ?? 0) > 12_000)
    return json({ error: "Request is too large." }, 413);

  const ip = requestIp(request);
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !publishableKey || !secretKey)
    return json({ error: "Public campaign actions are unavailable right now." }, 503);
  if (!ip) return json({ error: "Request could not be rate limited." }, 503);

  let raw: string;
  let payload: unknown;
  try {
    raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 10_000) return json({ error: "Request is too large." }, 413);
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (payload && typeof payload === "object" && (payload as Record<string, unknown>).action === "submit")
    return json({ error: "SlagBio form submissions have been retired. Use the campaign's Google Form." }, 410);
  if (!isAction(payload)) return json({ error: "Invalid campaign action." }, 400);

  const action = payload;
  const admin = createClient(projectUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const rateSecret = Deno.env.get("RATE_LIMIT_SECRET") || secretKey;
  const rateKey = await hashRateKey(ip, "metric", rateSecret);
  const { data: hitCount, error: rateError } = await admin.rpc("consume_public_form_rate_limit", {
    p_ip_hash: rateKey,
  });
  if (rateError) return json({ error: "Public campaign actions are unavailable right now." }, 503);
  const limit = 180;
  if (typeof hitCount !== "number" || hitCount > limit)
    return json({ error: "Please wait a minute before trying again." }, 429);
  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("id,status,starts_at,expires_at")
    .eq("id", action.campaignId)
    .maybeSingle();
  const now = Date.now();
  if (
    campaignError || !campaign || campaign.status !== "published" ||
    !campaign.starts_at || !campaign.expires_at ||
    new Date(campaign.starts_at).getTime() > now || new Date(campaign.expires_at).getTime() <= now
  ) return json({ error: "This campaign is not accepting public actions." }, 404);

  const { data, error } = await admin.rpc("record_public_campaign_metric", {
    p_campaign_id: campaign.id,
    p_metric: action.metric,
  });
  if (error) return json({ error: "Could not record this action." }, 503);
  return json({ recorded: data === true }, 200);
});
