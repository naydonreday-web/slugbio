import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, LogOut, MousePointer2, Palette, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setCursorPref, useStore } from "@/lib/slag/store";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/use-auth";

export function AppNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const auth = useAuth();
  const { prefs, ready, profile } = useStore();
  const signOut = async () => {
    const { error } = await getSupabaseBrowserClient().auth.signOut();
    if (error) toast.error("Couldn't sign out. Try again.");
  };
  return (
    <nav className="glass fixed top-4 left-1/2 z-40 flex w-[95%] max-w-7xl -translate-x-1/2 items-center justify-between rounded-full py-2.5 pr-2.5 pl-5 md:top-6 md:py-3 md:pr-3 md:pl-6">
      <Logo />
      <div className="flex items-center gap-2 md:gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setCursorPref(!prefs.cursor)}
              aria-pressed={ready && prefs.cursor}
              aria-label="Toggle custom cursor"
              className={cn(
                "hidden h-10 w-10 items-center justify-center rounded-full transition-colors md:flex",
                ready && prefs.cursor ? "text-primary" : "text-muted-foreground hover:text-primary",
              )}
            >
              <MousePointer2 className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {ready && prefs.cursor ? "Custom cursor on" : "Custom cursor off"}
          </TooltipContent>
        </Tooltip>
        {ready && profile && (
          <Link
            to="/onboarding"
            aria-label="Your profile"
            title={profile.name}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary text-sm font-bold text-tertiary-foreground transition-transform hover:scale-105"
          >
            {profile.name.trim().charAt(0).toUpperCase()}
          </Link>
        )}
        {!auth.loading && !auth.user && (
          <Link
            to="/login"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        )}
        {auth.user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/account"
                aria-label="Account settings"
                aria-current={path === "/account" ? "page" : undefined}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  path === "/account"
                    ? "bg-foreground text-background"
                    : "bg-surface-container text-foreground hover:bg-surface-dim",
                )}
              >
                <Settings2 className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Account settings</TooltipContent>
          </Tooltip>
        )}
        {auth.user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        )}
        {auth.user?.app_metadata?.role === "admin" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin/templates"
                aria-label="Review templates"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-foreground hover:bg-surface-dim"
              >
                <ShieldCheck className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Review templates</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/styles"
              aria-label="Browse poster styles"
              aria-current={path === "/styles" ? "page" : undefined}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                path === "/styles"
                  ? "bg-foreground text-background"
                  : "bg-surface-container text-foreground hover:bg-surface-dim",
              )}
            >
              <Palette className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Poster styles</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/campaigns"
              aria-label="All campaigns"
              aria-current={path.startsWith("/campaigns") ? "page" : undefined}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                path.startsWith("/campaigns")
                  ? "bg-foreground text-background"
                  : "bg-surface-container text-foreground hover:bg-surface-dim",
              )}
            >
              <LayoutGrid className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>All campaigns</TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}
