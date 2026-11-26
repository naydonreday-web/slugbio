import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

type CampaignBlock = {
  id?: string;
  type?: string;
  content?: {
    fields?: Array<{
      id: string;
      type: string;
      required?: boolean;
      options?: string[];
    }>;
  };
};

type CampaignAction =
  | { action: "track"; campaignId: string; metric: "view" | "click" | "share" }
  | { action: "submit"; campaignId: string; formBlockId: string; responseId: string; values: Record<string, unknown>; honeypot?: string };

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
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const address = forwarded || request.headers.get("cf-connecting-ip")?.trim();
  return address && address.length <= 100 && /^[0-9a-fA-F:.]+$/.test(address) ? address : null;
}

function isAction(value: unknown): value is CampaignAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  if (typeof action.campaignId !== "string" || action.campaignId.length < 3 || action.campaignId.length > 80)
    return false;
  if (action.action === "track")
    return action.metric === "view" || action.metric === "click" || action.metric === "share";
  return action.action === "submit" &&
    typeof action.formBlockId === "string" && /^[A-Za-z0-9_-]{3,80}$/.test(action.formBlockId) &&
    typeof action.responseId === "string" && /^[A-Za-z0-9_-]{3,80}$/.test(action.responseId) &&
    !!action.values && typeof action.values === "object" && !Array.isArray(action.values) &&
    (action.honeypot === undefined || typeof action.honeypot === "string");
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
  if (!isAction(payload)) return json({ error: "Invalid campaign action." }, 400);

  const action = payload;
  const admin = createClient(projectUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const rateSecret = Deno.env.get("RATE_LIMIT_SECRET") || secretKey;
  const rateScope = action.action === "submit" ? "form" : "metric";
  const rateKey = await hashRateKey(ip, rateScope, rateSecret);
  const { data: hitCount, error: rateError } = await admin.rpc("consume_public_form_rate_limit", {
    p_ip_hash: rateKey,
  });
  if (rateError) return json({ error: "Public campaign actions are unavailable right now." }, 503);
  const limit = action.action === "submit" ? 30 : 180;
  if (typeof hitCount !== "number" || hitCount > limit)
    return json({ error: "Please wait a minute before trying again." }, 429);
  if (action.action === "submit" && action.honeypot?.length)
    return json({ submitted: true }, 200);

  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("id,status,starts_at,expires_at,blocks")
    .eq("id", action.campaignId)
    .maybeSingle();
  const now = Date.now();
  if (
    campaignError || !campaign || campaign.status !== "published" ||
    !campaign.starts_at || !campaign.expires_at ||
    new Date(campaign.starts_at).getTime() > now || new Date(campaign.expires_at).getTime() <= now
  ) return json({ error: "This campaign is not accepting public actions." }, 404);

  if (action.action === "track") {
    const { data, error } = await admin.rpc("record_public_campaign_metric", {
      p_campaign_id: campaign.id,
      p_metric: action.metric,
    });
    if (error) return json({ error: "Could not record this action." }, 503);
    return json({ recorded: data === true }, 200);
  }

  const formBlock = (campaign.blocks as CampaignBlock[])
    .find((block) => block.id === action.formBlockId && block.type === "form");
  const fields = formBlock?.content?.fields ?? [];
  if (!fields.length) return json({ error: "This campaign does not have a form." }, 400);

  const allowed = new Map(fields.map((field) => [field.id, field]));
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(action.values)) {
    if (!allowed.has(key) || typeof value !== "string" || value.length > 2000)
      return json({ error: "The form response is invalid." }, 400);
    const field = allowed.get(key)!;
    if (field.type === "email" && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
      return json({ error: "Enter a valid email address." }, 400);
    if (field.type === "select" && value && field.options && !field.options.includes(value))
      return json({ error: "Choose a valid option." }, 400);
    values[key] = value;
  }
  for (const field of fields) {
    if (field.required && !(values[field.id] ?? "").trim())
      return json({ error: "Complete all required fields." }, 400);
  }

  const { error: responseError } = await admin.from("campaign_responses").insert({
    id: action.responseId,
    campaign_id: campaign.id,
    response_data: values,
  });
  if (responseError?.code === "23505") return json({ submitted: true }, 200);
  if (responseError) return json({ error: "Could not submit your response. Try again." }, 503);
  return json({ submitted: true }, 200);
});
