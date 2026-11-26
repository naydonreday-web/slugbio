import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { AppNav } from "@/components/slag/AppNav";
import { PosterThumb } from "@/components/slag/PosterThumb";
import { Button } from "@/components/ui/button";
import { buildSeedCampaigns } from "@/lib/slag/seed";
import {
  BLOCK_STYLES,
  REQUIREMENT_LABELS,
  STYLED_BLOCKS,
  missingRequirements,
  styleContext,
  type BlockVisualStyle,
  type StyledBlockType,
} from "@/lib/slag/templates/styles";
import { PROFILE_LABELS } from "@/lib/slag/templates/profiles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/styles")({
  head: () => ({
    meta: [
      { title: "Poster styles — SlagBio" },
      {
        name: "description",
        content:
          "Explore the poster styles SlagBio can draw and see how they adapt to real campaign content.",
      },
    ],
  }),
  component: StylesGallery,
});

const SAMPLE_CAMPAIGNS = buildSeedCampaigns();

function campaignSample(style: BlockVisualStyle) {
  const candidates = SAMPLE_CAMPAIGNS.flatMap((campaign) => {
    const block = campaign.blocks.find((item) => item.type === style.blockType);
    if (!block) return [];
    const missing = missingRequirements(style, block, styleContext(campaign.blocks, campaign.slug));
    return [{ campaign, block, suitable: missing.length === 0 }];
  });
  const chosen = candidates.find((candidate) => candidate.suitable) ?? candidates[0];
  if (!chosen) return undefined;
  const campaign = structuredClone(chosen.campaign);
  const block = campaign.blocks.find((item) => item.id === chosen.block.id);
  if (block) block.style.variant = style.id;
  return { campaign, blockId: chosen.block.id, suitable: chosen.suitable };
}

function StylesGallery() {
  const [filter, setFilter] = useState<StyledBlockType | "all">("all");
  const [query, setQuery] = useState("");
  const visibleStyles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return BLOCK_STYLES.filter((style) => {
      const matchesType = filter === "all" || style.blockType === filter;
      const matchesQuery =
        !normalized ||
        [
          style.name,
          style.id,
          style.description,
          ...style.characteristics,
          ...style.profiles.map((id) => PROFILE_LABELS[id]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [filter, query]);

  return (
    <div className="bg-ambient min-h-dvh px-4 pt-28 pb-16 md:px-8">
      <AppNav />
      <main className="mx-auto max-w-7xl">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft /> Dashboard
          </Link>
        </Button>
        <div className="mt-5 max-w-3xl">
          <span className="text-label-caps tracking-widest text-muted-foreground">
            SLAGBIO DESIGN SYSTEM
          </span>
          <h1 className="mt-2 text-display-sm font-extrabold">Poster styles</h1>
          <p className="mt-3 text-muted-foreground">
            Each card previews a real campaign with one block changed to that style. Requirements
            are shown so you can see what content makes the design work.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Filter styles by block type">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={filterButton(filter === "all")}
            >
              All styles
            </button>
            {STYLED_BLOCKS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={filterButton(filter === type)}
              >
                {type}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background/70 pr-3 pl-10 text-sm outline-none focus:border-primary"
              placeholder="Search styles or profiles"
            />
          </label>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          {visibleStyles.length} styles · {STYLED_BLOCKS.length} block types ·{" "}
          {Object.keys(PROFILE_LABELS).length} creative directions
        </p>
        {visibleStyles.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleStyles.map((style) => (
              <StyleCard key={style.id} style={style} />
            ))}
          </div>
        ) : (
          <div className="glass mt-5 rounded-3xl p-8 text-center text-sm text-muted-foreground">
            No styles match that search.
          </div>
        )}
        <div className="glass mt-12 flex flex-col items-start justify-between gap-4 rounded-3xl p-6 md:flex-row md:items-center md:p-8">
          <div>
            <h2 className="text-headline-sm font-bold">Ready to make one yours?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a campaign, choose a layout, then edit every block and detail.
            </p>
          </div>
          <Button asChild>
            <Link to="/create">
              <Sparkles /> Create a campaign
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function filterButton(active: boolean) {
  return cn(
    "rounded-full border px-3.5 py-2 text-xs font-semibold capitalize transition-colors",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-glass-border bg-glass text-muted-foreground hover:text-foreground",
  );
}

function StyleCard({ style }: { style: BlockVisualStyle }) {
  const cardRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const sample = useMemo(() => campaignSample(style), [style]);

  useEffect(() => {
    const node = cardRef.current;
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  return (
    <article ref={cardRef} className="glass overflow-hidden rounded-3xl">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-container">
        {inView && sample ? (
          <PosterThumb
            campaign={sample.campaign}
            focusBlockId={sample.blockId}
            className="h-full w-full"
          />
        ) : (
          <div className="absolute inset-4 animate-pulse rounded-2xl bg-glass-strong" />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
          {style.blockType}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-bold">{style.name}</h2>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{style.id}</p>
          </div>
          <span className="shrink-0 rounded-full bg-surface-container px-2 py-1 text-[10px] font-semibold capitalize">
            {style.preview.density}
          </span>
        </div>
        <p className="mt-3 min-h-10 text-xs leading-relaxed text-muted-foreground">
          {style.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {style.characteristics.slice(0, 3).map((item) => (
            <span
              key={item}
              className="rounded-full border border-glass-border px-2 py-1 text-[10px] text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
        {style.requiredContent.length > 0 && (
          <p className="mt-3 text-[10px] text-muted-foreground">
            Needs {style.requiredContent.map((item) => REQUIREMENT_LABELS[item]).join(", ")}
            {sample && !sample.suitable && " · sample uses a compatible fallback"}
          </p>
        )}
        <div className="mt-4 border-t border-glass-border pt-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Mobile:</span> {style.responsive.mobile}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Desktop:</span>{" "}
            {style.responsive.desktop}
          </p>
        </div>
        <div className="mt-3 text-[10px] text-muted-foreground">
          Fits {style.profiles.map((profile) => PROFILE_LABELS[profile]).join(" · ")}
        </div>
      </div>
    </article>
  );
}
