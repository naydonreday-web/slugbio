import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PosterRenderer } from "@/components/slag/poster/PosterRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { recordClick, recordView, useCampaignBySlug } from "@/lib/slag/store";
import { deriveStatus, formatDate } from "@/lib/slag/publishing";
import { SEED_META } from "@/lib/slag/seed";
import { whatsappLink } from "@/lib/slag/blocks";
import { POSTER_FONTS } from "@/lib/slag/themes";
import type { Campaign } from "@/lib/slag/types";
import { MessageCircle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { loadPublicCampaign } from "@/lib/supabase/data";

export const Route = createFileRoute("/c/$slug")({
  validateSearch: (s: Record<string, unknown>): { state?: "expired" } =>
    s.state === "expired" ? { state: "expired" } : {},
  head: ({ params }) => {
    const m = SEED_META[params.slug];
    const title = m ? `${m.title} — SlagBio` : "Campaign — SlagBio";
    const description = m?.description ?? "An interactive campaign poster shared with SlagBio.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PublicCampaign,
});

/** Campaign-less states (not found) keep SlagBio's look; anything tied to a campaign wears that campaign's theme. */
function Notice({
  campaign,
  label,
  title,
  body,
  contact,
}: {
  campaign?: Campaign;
  label?: string;
  title: string;
  body: string;
  contact?: string;
}) {
  if (!campaign) {
    return (
      <div className="bg-ambient flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <h1 className="text-headline-md">{title}</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">{body}</p>
        <Link
          to="/"
          className="mt-10 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Made with SlagBio
        </Link>
      </div>
    );
  }
  const t = campaign.theme;
  return (
    <div
      className="flex min-h-dvh flex-col items-center px-6 text-center"
      style={{ background: t.bg, color: t.text, fontFamily: POSTER_FONTS[t.font]?.family }}
    >
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center py-16">
        {label && (
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase"
            style={{ background: t.surface, color: t.muted }}
          >
            {label}
          </span>
        )}
        <h1 className="mt-5 text-[clamp(32px,9vw,52px)] leading-[1.05] font-extrabold tracking-tight">
          {title}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed" style={{ color: t.muted }}>
          {body}
        </p>
        {contact && (
          <a
            href={whatsappLink(contact)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 px-7 py-3.5 text-[16px] font-bold"
            style={{
              background: t.accent,
              color: t.accentText,
              borderRadius: `${Math.min(t.radius, 999)}px`,
            }}
          >
            <MessageCircle className="h-5 w-5" /> Contact the organiser
          </a>
        )}
      </div>
      <Link to="/" className="pb-6 text-xs" style={{ color: t.muted }}>
        Made with SlagBio
      </Link>
    </div>
  );
}

function PublicCampaign() {
  const { slug } = Route.useParams();
  const { state } = Route.useSearch();
  const local = useCampaignBySlug(slug);
  const [remote, setRemote] = useState<{ ready: boolean; campaign?: Campaign }>({ ready: false });
  const configured = isSupabaseConfigured();
  useEffect(() => {
    if (!configured) return;
    let live = true;
    void loadPublicCampaign(slug)
      .then((campaign) => {
        if (live) setRemote({ ready: true, campaign });
      })
      .catch(() => {
        if (live) setRemote({ ready: true });
      });
    return () => {
      live = false;
    };
  }, [configured, slug]);
  const { ready, campaign } = configured ? remote : local;
  const counted = useRef(false);
  const status = campaign ? deriveStatus(campaign) : null;
  useEffect(() => {
    if (!campaign || status !== "active" || counted.current) return;
    counted.current = true;
    const k = `slagbio:viewed:${slug}`;
    if (!sessionStorage.getItem(k)) {
      sessionStorage.setItem(k, "1");
      recordView(campaign.id);
    }
  }, [campaign, status, slug]);
  if (!ready) return <Skeleton className="mx-auto mt-10 h-[80vh] max-w-md rounded-3xl" />;
  if (!campaign)
    return <Notice title="Campaign not found" body="This link doesn't point to a campaign." />;
  if (status === "draft")
    return (
      <Notice
        title="Not live yet"
        body="This campaign hasn't been published yet. Check back soon."
      />
    );
  if (status === "scheduled")
    return (
      <Notice
        campaign={campaign}
        label="Coming soon"
        title={campaign.title}
        body={`Goes live on ${formatDate(campaign.startsAt)}.`}
      />
    );
  if (status === "expired" || status === "archived" || state === "expired")
    return (
      <Notice
        campaign={campaign}
        label="This campaign has ended"
        title={campaign.title}
        body={
          campaign.expiredMessage || "This campaign is no longer running. Thanks for your interest."
        }
        contact={campaign.expiredContact}
      />
    );
  return (
    <div className="min-h-dvh" style={{ background: campaign.theme.bg }}>
      <div className="mx-auto max-w-3xl">
        <PosterRenderer
          campaign={campaign}
          mode="public"
          onCtaClick={() => recordClick(campaign.id)}
        />
        <div className="pt-4 pb-6 text-center text-[11px]" style={{ color: campaign.theme.muted }}>
          <Link to="/" className="hover:underline">
            Made with SlagBio
          </Link>
        </div>
      </div>
    </div>
  );
}
