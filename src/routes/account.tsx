import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Ambient } from "@/components/slag/Ambient";
import { AppNav } from "@/components/slag/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { clearAccountDataCache } from "@/lib/slag/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthGuard } from "@/lib/supabase/use-auth";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account settings — SlugBio" },
      { name: "description", content: "Manage your SlugBio account and personal data." },
    ],
  }),
  component: AccountSettings,
});

function AccountSettings() {
  const auth = useAuthGuard();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  if (auth.loading || !auth.user) return <div className="p-8"><Skeleton className="mx-auto h-[70vh] max-w-2xl rounded-3xl" /></div>;

  const deleteAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.user?.email || confirmation !== "DELETE" || !password) return;
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { password, confirmation },
      });
      if (error) throw error;

      clearAccountDataCache(auth.user.id);
      await supabase.auth.signOut({ scope: "local" });
      toast.success("Your account and its data have been deleted.");
      await navigate({ to: "/", replace: true });
    } catch {
      toast.error("We couldn't delete your account. Check your password and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh">
      <Ambient />
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 pt-32 pb-20 md:pt-40">
        <p className="text-label-caps tracking-[0.18em] text-muted-foreground">ACCOUNT</p>
        <h1 className="mt-3 text-headline-lg">Account settings</h1>
        <section className="glass mt-8 rounded-3xl p-6 md:p-8">
          <h2 className="text-lg font-bold">Sign-in email</h2>
          <p className="mt-2 text-sm text-muted-foreground">{auth.user.email}</p>
        </section>

        <section className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 p-6 md:p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <h2 className="text-lg font-bold">Delete account and data</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This permanently deletes your account, profile, campaigns, templates, and all form
                responses collected through your campaigns. This action cannot be undone.
              </p>
            </div>
          </div>

          <form onSubmit={deleteAccount} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold" htmlFor="delete-password">
              Confirm your password
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={busy}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="delete-confirmation">
              Type DELETE to confirm
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                required
                disabled={busy}
              />
            </label>
            <Button
              type="submit"
              variant="destructive"
              disabled={busy || !password || confirmation !== "DELETE"}
              className="mt-1 h-11 w-fit gap-2"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete my account permanently
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
