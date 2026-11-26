import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function json(body: Record<string, string>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (Number(request.headers.get("content-length") ?? 0) > 4096)
    return json({ error: "Request is too large." }, 413);

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !projectUrl || !publishableKey || !secretKey)
    return json({ error: "Account deletion is not available right now." }, 503);

  let body: { password?: unknown; confirmation?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (
    typeof body.password !== "string" ||
    body.password.length < 1 ||
    body.password.length > 1024 ||
    body.confirmation !== "DELETE"
  ) return json({ error: "Confirm the deletion and enter your password." }, 400);

  const admin = createClient(projectUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user?.email) return json({ error: "Please sign in again." }, 401);

  const verifier = createClient(projectUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: body.password,
  });
  if (passwordError || verified.user?.id !== user.id)
    return json({ error: "The password is incorrect." }, 401);

  const { error: sessionError } = await admin.auth.admin.signOut(token, "global");
  if (sessionError) return json({ error: "Please sign in again before deleting your account." }, 401);

  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
  if (deletionError) return json({ error: "Account deletion failed. Please try again." }, 500);

  return json({ message: "Account deleted." }, 200);
});
