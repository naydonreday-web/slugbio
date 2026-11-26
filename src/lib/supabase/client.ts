import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined")
    throw new Error("Supabase browser client is only available in the browser.");
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to connect SlagBio to Supabase.",
    );

  client = createBrowserClient<Database>(url, key, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: window.location.protocol === "https:",
    },
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  return client;
}
