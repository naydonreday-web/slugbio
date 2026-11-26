import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { Logo } from "@/components/slag/Logo";
import { Button } from "@/components/ui/button";
import { Ambient } from "@/components/slag/Ambient";
import { inputCls } from "@/components/slag/Choice";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { action?: "update-password" } =>
    search.action === "update-password" ? { action: "update-password" } : {},
  head: () => ({
    meta: [
      { title: "Sign in — SlagBio" },
      { name: "description", content: "Sign in or create a SlagBio account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { action } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "update">(
    action === "update-password" ? "update" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const auth = getSupabaseBrowserClient().auth;
      if (mode === "signin") {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await navigate({ to: "/" });
      } else if (mode === "reset") {
        const { error } = await auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login?action=update-password`,
        });
        if (error) throw error;
        setMessage("If an account uses that email, we’ve sent a password reset link.");
      } else if (mode === "update") {
        const { error } = await auth.updateUser({ password });
        if (error) throw error;
        await navigate({ to: "/" });
      } else {
        const { data, error } = await auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (data.session) await navigate({ to: "/" });
        else setMessage("Check your email for a confirmation link, then return here to sign in.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "We couldn't complete that request. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh">
      <Ambient />
      <header className="glass fixed top-4 left-1/2 z-40 flex w-[95%] max-w-7xl -translate-x-1/2 items-center justify-between rounded-full py-2.5 pr-2.5 pl-5 md:top-6">
        <Logo />
        <Button asChild variant="glass" className="h-10 px-4 text-sm">
          <Link to="/">Back to home</Link>
        </Button>
      </header>
      <main className="mx-auto flex min-h-dvh w-full max-w-[520px] items-center px-4 py-28">
        <section className="glass w-full rounded-3xl p-6 md:p-9" aria-labelledby="login-heading">
          <div className="mb-7 flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-glass-border bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h1 id="login-heading" className="text-headline-md font-extrabold">
                {mode === "signin"
                  ? "Welcome back"
                  : mode === "signup"
                    ? "Create your account"
                    : mode === "reset"
                      ? "Reset your password"
                      : "Choose a new password"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep your campaigns saved and ready to share.
              </p>
            </div>
          </div>

          {!configured ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              Supabase isn’t configured. Add the project URL and publishable key to your environment
              before signing in.
            </p>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5">
              {mode !== "update" && (
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  Email address
                  <span className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(inputCls, "pl-11")}
                      placeholder="you@example.com"
                    />
                  </span>
                </label>
              )}
              {mode !== "reset" && (
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  Password
                  <span className="relative">
                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(inputCls, "pl-11")}
                      placeholder="At least 8 characters"
                    />
                  </span>
                </label>
              )}
              {message && (
                <p
                  role="status"
                  className="rounded-xl bg-surface-container p-3 text-sm text-muted-foreground"
                >
                  {message}
                </p>
              )}
              <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" /> Please wait…
                  </>
                ) : (
                  <>
                    {mode === "signin"
                      ? "Sign in"
                      : mode === "signup"
                        ? "Create account"
                        : mode === "reset"
                          ? "Send reset link"
                          : "Save new password"}{" "}
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>
          )}

          {configured && mode === "signin" && (
            <button
              type="button"
              onClick={() => {
                setMode("reset");
                setMessage("");
              }}
              className="mt-4 block w-full text-center text-sm font-semibold text-primary-ink underline underline-offset-4"
            >
              Forgot your password?
            </button>
          )}

          {configured && (mode === "signin" || mode === "signup") && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to SlagBio?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setMessage("");
                }}
                className="font-semibold text-primary-ink underline underline-offset-4"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}
          {configured && mode === "reset" && (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage("");
              }}
              className="mt-6 block w-full text-center text-sm font-semibold text-primary-ink underline underline-offset-4"
            >
              Back to sign in
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
