import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AppNav } from "@/components/slag/AppNav";
import { inputCls } from "@/components/slag/Choice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/lib/supabase/use-auth";
import {
  loadPendingTemplateReviews,
  reviewHostedTemplate,
  type PendingTemplateReview,
} from "@/lib/supabase/templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/templates")({
  head: () => ({
    meta: [
      { title: "Template review — SlugBio" },
      { name: "description", content: "Review and approve submitted campaign templates." },
    ],
  }),
  component: TemplateReviewPage,
});

function TemplateReviewPage() {
  const auth = useAuthGuard();
  const isAdmin = auth.user?.app_metadata?.role === "admin";
  const [items, setItems] = useState<PendingTemplateReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await loadPendingTemplateReviews());
    } catch (error) {
      toast.error("Couldn't load template reviews", {
        description:
          error instanceof Error ? error.message : "Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void refresh();
  }, [isAdmin, refresh]);

  const decide = async (item: PendingTemplateReview, decision: "approved" | "rejected") => {
    const key = `${item.templateId}@${item.version}`;
    setBusyKey(key);
    try {
      await reviewHostedTemplate(item.templateId, item.version, decision, notes[key]?.trim());
      toast.success(decision === "approved" ? "Template approved" : "Template rejected");
      setItems((current) =>
        current.filter((entry) => `${entry.templateId}@${entry.version}` !== key),
      );
    } catch (error) {
      toast.error("Couldn't save the review", {
        description:
          error instanceof Error ? error.message : "Check your connection and try again.",
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (auth.loading) return <Skeleton className="m-8 h-[70vh] rounded-3xl" />;
  if (!auth.user) return <Skeleton className="m-8 h-[70vh] rounded-3xl" />;
  if (!isAdmin) {
    return (
      <main className="bg-ambient flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-headline-md">Administrator access required</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This account cannot review templates. Ask a project administrator to grant access.
        </p>
        <Button asChild variant="ghost" className="mt-5">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </main>
    );
  }

  return (
    <div className="bg-ambient min-h-dvh px-4 pt-28 pb-12 md:px-8">
      <AppNav />
      <main className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft /> Dashboard
          </Link>
        </Button>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <span className="text-label-caps tracking-widest text-muted-foreground">
              ADMINISTRATION
            </span>
            <h1 className="mt-2 text-headline-lg">Template review</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Approve validated template versions before they appear in the shared library.
            </p>
          </div>
          <Button
            variant="glass"
            disabled={loading}
            onClick={() => void refresh()}
            aria-label="Refresh reviews"
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
          </Button>
        </div>

        {loading && items.length === 0 ? (
          <div className="mt-7 grid gap-4">
            <Skeleton className="h-56 rounded-3xl" />
            <Skeleton className="h-56 rounded-3xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="glass mt-7 rounded-3xl p-8 text-center text-sm text-muted-foreground">
            No templates are waiting for review.
          </div>
        ) : (
          <div className="mt-7 grid gap-4">
            {items.map((item) => {
              const key = `${item.templateId}@${item.version}`;
              const busy = busyKey === key;
              const colors = item.config.tokens.colors;
              return (
                <article
                  key={key}
                  className="glass grid gap-6 rounded-3xl p-5 md:grid-cols-[minmax(0,1fr)_240px] md:p-7"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-headline-sm font-bold">{item.name}</h2>
                      <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold">
                        v{item.version}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary-ink">
                        {item.source}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.config.description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Submitted {new Date(item.submittedAt).toLocaleString()} · account{" "}
                      {item.createdBy.slice(0, 8)}
                    </p>
                    {item.config.design?.notes.length ? (
                      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {item.config.design.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                    <label className="mt-5 block text-sm font-semibold">
                      Review note{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                      <textarea
                        maxLength={1000}
                        value={notes[key] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [key]: event.target.value }))
                        }
                        className={cn(inputCls, "mt-2 min-h-20 resize-y")}
                        placeholder="Add feedback for the creator"
                      />
                    </label>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button disabled={busy} onClick={() => void decide(item, "approved")}>
                        {busy && busyKey === key ? <Loader2 className="animate-spin" /> : <Check />}{" "}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void decide(item, "rejected")}
                      >
                        <X /> Reject
                      </Button>
                    </div>
                  </div>
                  <div
                    className="flex min-h-48 flex-col justify-between rounded-2xl p-5"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.muted}55`,
                    }}
                  >
                    <div>
                      <span
                        className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                        style={{ background: colors.surface, color: colors.muted }}
                      >
                        {item.config.category}
                      </span>
                      <p
                        className="mt-5 text-2xl font-extrabold leading-tight"
                        style={{ fontFamily: item.config.typography.display }}
                      >
                        {item.config.name}
                      </p>
                      <p className="mt-2 text-xs" style={{ color: colors.muted }}>
                        {item.config.layout.width} · {item.config.layout.surface} ·{" "}
                        {item.config.supportedBlocks.length} block types
                      </p>
                    </div>
                    <div className="mt-6 flex gap-2" aria-label="Template colour palette">
                      {[
                        colors.bg,
                        colors.surface,
                        colors.text,
                        colors.accent,
                        colors.accentText,
                      ].map((color, index) => (
                        <span
                          key={`${color}-${index}`}
                          className="h-7 flex-1 rounded-md border border-black/10"
                          style={{ background: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
