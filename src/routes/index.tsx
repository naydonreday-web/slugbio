import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Sparkles, Clock3, Inbox, Megaphone, UserRound } from "lucide-react";
import { AppNav } from "@/components/slag/AppNav";
import { Ambient } from "@/components/slag/Ambient";
import { CampaignCard } from "@/components/slag/CampaignCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstName } from "@/lib/slag/profile";
import { useStore } from "@/lib/slag/store";
import { daysLeft, deriveStatus, formatDateTime, recentCampaigns } from "@/lib/slag/publishing";
import { useAuthGuard } from "@/lib/supabase/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — SlugBio" },
      { name: "description", content: "Your SlugBio campaigns at a glance: drafts, live posters, views and responses." },
      { property: "og:title", content: "Overview — SlugBio" },
      { property: "og:description", content: "Your SlugBio campaigns at a glance: drafts, live posters, views and responses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const PROMPT_CHIPS = ["Event invitation", "Product launch", "Weekend special", "Service promo"];

function Dashboard() {
  const auth = useAuthGuard();
  const { ready, campaigns, profile } = useStore();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  const withStatus = useMemo(() => campaigns.map((c) => ({ c, s: deriveStatus(c) })), [campaigns]);
  const recentCampaignsList = useMemo(() => recentCampaigns(campaigns), [campaigns]);
  const visibleCount = withStatus.filter((x) => x.s !== "archived").length;

  const metrics = [
    { label: "Total campaigns", value: campaigns.length },
    { label: "Active", value: withStatus.filter((x) => x.s === "active").length },
    { label: "Total views", value: campaigns.reduce((n, c) => n + c.views, 0) },
    { label: "Past responses", value: campaigns.reduce((n, c) => n + c.responses.length, 0) },
  ];
  const expiring = withStatus
    .filter(({ c, s }) => s === "active" && (daysLeft(c.expiresAt) ?? 99) <= 10)
    .sort((a, b) => +new Date(a.c.expiresAt!) - +new Date(b.c.expiresAt!));
  const recent = campaigns
    .flatMap((c) => c.responses.map((r) => ({ c, r })))
    .sort((a, b) => +new Date(b.r.submittedAt) - +new Date(a.r.submittedAt))
    .slice(0, 5);

  const start = (text?: string) => {
    const p = (text ?? prompt).trim();
    navigate({ to: "/create", search: p ? { prompt: p } : {} });
  };

  if (auth.loading || !auth.user) return <div className="p-8"><Skeleton className="mx-auto h-[70vh] max-w-5xl rounded-3xl" /></div>;

  return (
    <div className="relative min-h-screen">
      <Ambient />
      <AppNav />
      <main className="mx-auto w-full max-w-[1280px] px-4 pt-28 pb-24 md:px-10 md:pt-32 lg:px-16">
        {ready && !profile && (
          <Link to="/onboarding" className="glass mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-3 pr-4 transition-colors hover:bg-glass-strong">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary"><UserRound className="h-5 w-5" /></span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-bold">Finish setting up your profile</span>
              <span className="block truncate text-xs text-muted-foreground">Add your name and Lesotho phone number.</span>
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold text-primary-ink"><span className="hidden sm:inline">Set up</span> <ArrowRight className="h-4 w-4" /></span>
          </Link>
        )}
        <header>
          <span className="text-label-caps text-muted-foreground uppercase">Overview</span>
          <h1 className="mt-2 text-[32px] leading-tight font-extrabold tracking-tight md:text-headline-lg">
            {ready && profile ? `Welcome back, ${firstName(profile.name)}` : "Your campaigns"}
          </h1>
          <p className="mt-1 text-body-md text-muted-foreground">Here's how your posters are doing.</p>
        </header>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            {/* The one place to start a campaign */}
            <form className="glass rounded-3xl p-5 md:p-6" onSubmit={(e) => { e.preventDefault(); start(); }} aria-labelledby="create-h">
              <h2 id="create-h" className="flex items-center gap-2 text-[17px] font-bold">
                <span className="rounded-full bg-lime px-2 py-1 text-label-caps text-lime-foreground uppercase">AI</span> Start a new campaign
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); start(); } }}
                placeholder="Describe the campaign you want to create..."
                aria-label="Describe your campaign"
                className="mt-3 min-h-[64px] w-full resize-none border-none bg-transparent text-body-lg text-foreground outline-none placeholder:text-outline"
                maxLength={400}
              />
              <div className="scrollbar-none -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 md:-mx-6 md:px-6">
                {PROMPT_CHIPS.map((chip) => (
                  <button key={chip} type="button" onClick={() => setPrompt((p) => (p ? p : `${chip}: `))} className="shrink-0 rounded-full border border-glass-border bg-glass px-4 py-1.5 text-sm shadow-pill transition-colors hover:bg-glass-strong">
                    {chip}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-glass-border pt-4">
                <Link to="/create" className="flex items-center gap-2 rounded-full px-2 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground sm:px-3">
                  <Sparkles className="h-4 w-4 text-primary" /> Guided questions
                </Link>
                <Button type="submit" size="lg" className="h-12 gap-2 px-5 text-[15px] font-bold transition-transform hover:scale-[1.03] md:px-6">
                  <span className="sm:hidden">Create</span><span className="hidden sm:inline">Create campaign</span> <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </form>

            <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4" aria-label="Overview metrics">
              {metrics.map((m) => (
                <div key={m.label} className="glass rounded-[10px] p-4 md:p-5">
                  <div className="text-label-caps text-muted-foreground uppercase">{m.label}</div>
                  {ready ? <div className="mt-3 text-[28px] leading-none font-extrabold tracking-tight md:text-[34px]">{m.value.toLocaleString()}</div> : <Skeleton className="mt-3 h-9 w-16 rounded-full" />}
                </div>
              ))}
            </section>

            <section aria-labelledby="recent-h" className="min-w-0">
              <div className="flex items-end justify-between gap-4">
                <h2 id="recent-h" className="text-headline-md">Recent campaigns</h2>
                {ready && visibleCount > 0 && (
                  <Link to="/campaigns" className="flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-primary-ink hover:underline">
                    View all{visibleCount > recentCampaignsList.length ? ` ${visibleCount}` : ""} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
              {!ready ? (
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
                  {[0, 1].map((i) => <Skeleton key={i} className="aspect-[4/6] rounded-[10px]" />)}
                </div>
              ) : recentCampaignsList.length === 0 ? (
                <div className="glass mt-4 flex flex-col items-center gap-3 rounded-[10px] px-6 py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Megaphone className="h-5 w-5" /></span>
                  <div className="text-lg font-bold">No campaigns yet</div>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {campaigns.length ? "Everything is archived. " : ""}Describe a campaign above and AI will design your first poster.
                    {campaigns.length > 0 && <> <Link to="/campaigns" className="font-semibold text-primary-ink underline-offset-4 hover:underline">See archived</Link></>}
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
                  {recentCampaignsList.map((c) => <CampaignCard key={c.id} campaign={c} />)}
                </div>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-5">
            <div className="glass rounded-[10px] p-5">
              <div className="flex items-center gap-2 text-label-caps text-muted-foreground uppercase"><Clock3 className="h-4 w-4" /> Expiring soon</div>
              {ready && expiring.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Nothing ends in the next 10 days.</p>}
              <ul className="mt-3 flex flex-col">
                {expiring.map(({ c }) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 border-b border-glass-border py-3 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{daysLeft(c.expiresAt)} days left</div>
                    </div>
                    <Button asChild size="sm" variant="glass"><Link to="/publish/$id" params={{ id: c.id }}>Extend</Link></Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-[10px] p-5">
              <div className="flex items-center gap-2 text-label-caps text-muted-foreground uppercase"><Inbox className="h-4 w-4" /> Past responses</div>
              {ready && recent.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Historical SlugBio submissions remain here for reference.</p>}
              <ul className="mt-3 flex flex-col">
                {recent.map(({ c, r }) => {
                  const first = Object.values(r.values).find(Boolean) ?? "Anonymous";
                  return (
                    <li key={r.id}>
                      <Link to="/campaigns/$id" params={{ id: c.id }} className="flex items-center gap-3 border-b border-glass-border py-3 last:border-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary/15 text-sm font-bold text-tertiary">{first.charAt(0).toUpperCase()}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{first}</div>
                          <div className="truncate text-xs text-muted-foreground">{c.title} · {formatDateTime(r.submittedAt)}</div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
