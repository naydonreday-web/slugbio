import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./client";

export interface AuthState {
  loading: boolean;
  user: User | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, user: null });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({ loading: false, user: null });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let live = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (live) setState({ loading: false, user: data.session?.user ?? null });
      })
      .catch(() => {
        if (live) setState({ loading: false, user: null });
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, user: session?.user ?? null });
    });

    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function useAuthGuard(): AuthState {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!auth.loading && !auth.user) void navigate({ to: "/login", replace: true });
  }, [auth.loading, auth.user, navigate]);
  return auth;
}
