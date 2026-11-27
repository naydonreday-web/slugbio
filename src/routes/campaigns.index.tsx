import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Megaphone, Search } from "lucide-react";
import { AppNav } from "@/components/slag/AppNav";
import { Ambient } from "@/components/slag/Ambient";
import { CampaignCard } from "@/components/slag/CampaignCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/slag/store";
import { deriveStatus } from "@/lib/slag/publishing";
import type { CampaignStatus } from "@/lib/slag/types";
import { cn } from "@/lib/utils";
import { useAuthGuard } from "@/lib/supabase/use-auth";

export const Route = createFileRoute("/campaigns/")({
  head: () => ({
    meta: [
      { title: "All campaigns — SlugBio" },
      { name: "description", content: "Every SlugBio poster you've made: drafts, live, scheduled, ended and archived campaigns." },
      { property: "og:title", content: "All campaigns — SlugBio" },
      { property: "og:description", content: "Every SlugBio poster you've made: drafts, live, scheduled, ended and archived campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignsPage,
});

const FILTERS: { id: "all" | CampaignStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "expired", label: "Expired" },
  { id: "archived", label: "Archived" },
];

function CampaignsPage() {
  const auth = useAuthGuard();
  const { ready, campaigns } = useStore();
  const [filter, setFilter] = useState<"all" | CampaignStatus>("all");
  const [q, setQ] = useState("");

  const withStatus = useMemo(() => campaigns.map((c) => ({ c, s: deriveStatus(c) })), [campaigns]);
  const shown = withStatus
    .filter(({ s }) => (filter === "all" ? s !== "archived" : s === filter))
    .filter(({ c }) => c.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => +new Date(b.c.updatedAt) - +new Date(a.c.updatedAt));
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, f.id === "all" ? withStatus.filter((x) => x.s !== "archived").length : withStatus.filter((x) => x.s === f.id).length]));
  const none = ready && campaigns.length === 0;

  if (auth.loading || !auth.user) return <div className="p-8"><Skeleton className="mx-auto h-[70vh] max-w-5xl rounded-3xl" /></div>;

  return (
    <div className="relative min-h-screen">
      <Ambient />
      <AppNav />
      <main className="mx-auto w-full max-w-[1280px] px-4 pt-28 pb-24 md:px-10 md:pt-32 lg:px-16">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Overview
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-label-caps text-muted-foreground uppercase">My campaigns</span>
            <h1 className="mt-2 text-[32px] leading-tight font-extrabold tracking-tight md:text-headline-lg">All campaigns</h1>
          </div>
          <label className="glass flex h-11 w-full items-center gap-2 rounded-full px-4 sm:w-72">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns" aria-label="Search campaigns" className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm" />
          </label>
        </div>
        <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn("flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", filter === f.id ? "border-foreground bg-foreground text-background" : "border-glass-border bg-glass text-foreground hover:bg-glass-strong")}
            >
              {f.label}
              <span className={cn("text-xs", filter === f.id ? "opacity-70" : "text-muted-foreground")}>{ready ? counts[f.id] : "·"}</span>
            </button>
          ))}
        </div>

        {!ready ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/6] rounded-[10px]" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="glass mt-6 flex flex-col items-center gap-4 rounded-[10px] px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"><Megaphone className="h-6 w-6" /></span>
            <div>
              <div className="text-lg font-bold">{none ? "No campaigns yet" : q ? "No campaigns match your search" : `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} right now`}</div>
              <p className="mt-1 text-sm text-muted-foreground">{none ? "Describe your first campaign on the overview and AI will design the poster." : q ? "Try a different name." : "Try another filter."}</p>
            </div>
            {none ? (
              <Button asChild><Link to="/">Go to overview</Link></Button>
            ) : (
              (q || filter !== "all") && <Button variant="glass" onClick={() => { setQ(""); setFilter("all"); }}>Show all campaigns</Button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map(({ c }) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}
      </main>
    </div>
  );
}
