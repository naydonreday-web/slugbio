import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ShareDialog } from "@/components/slag/ShareDialog";
import { PosterThumb } from "@/components/slag/PosterThumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { inputCls } from "@/components/slag/Choice";
import { isSlugTaken, publishCampaign, useCampaign } from "@/lib/slag/store";
import { DURATIONS, PUBLIC_HOST, expiryFrom, formatDate, slugify } from "@/lib/slag/publishing";
import { cn } from "@/lib/utils";
import { safeGoogleFormUrl } from "@/lib/slag/blocks";
import { useAuthGuard } from "@/lib/supabase/use-auth";
import { isCampaignSlugAvailable } from "@/lib/supabase/data";

export const Route = createFileRoute("/publish/$id")({
  head: () => ({
    meta: [
      { title: "Publish campaign — SlagBio" },
      {
        name: "description",
        content: "Choose a link, duration and privacy, then publish your campaign.",
      },
      { property: "og:title", content: "Publish campaign — SlagBio" },
      {
        property: "og:description",
        content: "Choose a link, duration and privacy, then publish your campaign.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Publish,
});

function Publish() {
  const auth = useAuthGuard();
  const { id } = Route.useParams();
  const { ready, campaign } = useCampaign(id);
  const [slug, setSlug] = useState<string | null>(null);
  const [publicHost, setPublicHost] = useState(() => {
    const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
    return configuredUrl ? new URL(configuredUrl).host : PUBLIC_HOST;
  });
  const [days, setDays] = useState(14);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => setPublicHost(window.location.host), []);
  if (auth.loading || !auth.user || !ready)
    return <Skeleton className="m-8 h-[80vh] rounded-3xl" />;
  if (!campaign)
    return (
      <div className="p-10 text-center">
        Campaign not found.{" "}
        <Link to="/" className="text-primary-ink">
          Back to dashboard
        </Link>
      </div>
    );
  const s = slug ?? campaign.slug;
  const slugErr =
    s.length < 3
      ? "At least 3 characters"
      : isSlugTaken(s, campaign.id)
        ? "That link is taken"
        : "";
  const formBlock = campaign.blocks.find((block) => block.type === "form");
  const hasFormAction = campaign.blocks.some(
    (block) => block.type === "cta" && block.content.action === "form",
  );
  const formError = formBlock
    ? safeGoogleFormUrl(formBlock.content.googleFormUrl)
      ? ""
      : "Add a valid Google Forms responder link in the editor before publishing."
    : hasFormAction
      ? "Add a Google Forms block and responder link in the editor before publishing."
      : "";
  const start = new Date();
  const publish = async () => {
    if (slugErr || publishing) return;
    if (formError) {
      setError(formError);
      return;
    }
    setPublishing(true);
    setError("");
    try {
      if (!(await isCampaignSlugAvailable(s, campaign.id))) {
        setError("That link was just claimed. Choose another link and try again.");
        return;
      }
      publishCampaign(campaign.id, { slug: s, startsAt: start, days, visibility: "private" });
      setDone(true);
    } catch {
      setError("We couldn't publish your campaign. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  };
  return (
    <div className="bg-ambient min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" size="sm">
          <Link to="/studio/$id" params={{ id }}>
            <ArrowLeft /> Back to editor
          </Link>
        </Button>
        <h1 className="mt-4 text-headline-lg">Publish campaign</h1>
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="glass space-y-6 rounded-3xl p-6">
            <div>
              <div className="mb-2 text-sm font-semibold">Campaign link</div>
              <div className="flex items-center gap-1 rounded-xl border border-input bg-background/70 pl-4">
                <span className="text-sm text-muted-foreground">{publicHost}/c/</span>
                <input
                  value={s}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className={cn(inputCls, "border-0 bg-transparent pl-0 focus:ring-0")}
                />
              </div>
              <p
                className={cn(
                  "mt-1 text-xs",
                  slugErr ? "font-semibold text-destructive" : "text-lime-foreground",
                )}
              >
                {slugErr || "Available"}
              </p>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Duration</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DURATIONS.map((d) => (
                  <button
                    key={d.days}
                    onClick={() => setDays(d.days)}
                    className={cn(
                      "rounded-2xl border p-4 text-left",
                      days === d.days
                        ? "border-primary bg-primary/8"
                        : "border-glass-border bg-glass",
                    )}
                  >
                    <div className="font-bold">{d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.tagline}</div>
                    <div className="mt-2 font-semibold text-primary-ink">Free</div>
                  </button>
                ))}
              </div>
            </div>
            {formError && (
              <p role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                {formError}{" "}
                <Link to="/studio/$id" params={{ id }} className="font-semibold underline">
                  Open editor
                </Link>
              </p>
            )}
            <p className="rounded-2xl border border-glass-border bg-glass p-4 text-sm">
              <span className="block font-semibold">Link-only sharing</span>
              <span className="text-xs text-muted-foreground">
                Your campaign won’t appear in public discovery. Anyone with its link can view it.
              </span>
            </p>
          </div>
          <div className="glass h-fit space-y-3 rounded-3xl p-5 text-sm">
            <PosterThumb campaign={campaign} className="aspect-[4/5] w-full rounded-2xl" />
            <div className="font-bold">{campaign.title}</div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Starts</span>
              <span>{formatDate(start.toISOString())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{formatDate(expiryFrom(start, days).toISOString())}</span>
            </div>
            <div className="flex justify-between border-t border-glass-border pt-2 font-bold">
              <span>Publishing</span>
              <span>Free</span>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              className="w-full"
              size="lg"
              disabled={!!slugErr || !!formError || publishing}
              onClick={publish}
            >
              {publishing ? (
                <>
                  <Loader2 className="animate-spin" /> Publishing…
                </>
              ) : (
                "Publish for free"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No payment details required.
            </p>
          </div>
        </div>
      </div>
      <ShareDialog campaign={campaign} open={done} onOpenChange={setDone} celebrate />
    </div>
  );
}
