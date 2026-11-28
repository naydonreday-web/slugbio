import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Tag,
  Info,
  Instagram,
  Facebook,
  Twitter,
  Globe,
  MessageCircle,
  Music2,
  ArrowUpRight,
  Mail,
  ExternalLink,
} from "lucide-react";
import { elementCss, elementMeta } from "@/lib/slag/elements";
import { whatsappLink, safeUrl, safeGoogleFormUrl } from "@/lib/slag/blocks";
import { resolveImage } from "@/lib/slag/images";
import { POSTER_FONTS, isDark, readableAccent } from "@/lib/slag/themes";
import { renderLayout, type RenderLayout } from "@/lib/slag/templates/apply";
import type { TemplateConfig } from "@/lib/slag/templates/schema";
import { getTemplateConfig, hasTemplate, useTemplateCollections } from "@/lib/slag/templates/store";
import { getHostedTemplateVersion } from "@/lib/supabase/templates";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { parseEndsAt, resolveBlockStyle, styleContext } from "@/lib/slag/templates/styles";
import type { StyleContext } from "@/lib/slag/templates/styles";
import { QRCodeSVG } from "qrcode.react";
import type {
  Block,
  BlockContent,
  Campaign,
  DetailIcon,
  ElementKey,
  SocialPlatform,
  Theme,
} from "@/lib/slag/types";
import { EditableText } from "./EditableText";
import { cn } from "@/lib/utils";

export type PosterMode = "edit" | "preview" | "public" | "thumb";

export interface PosterProps {
  campaign: Pick<Campaign, "theme" | "blocks" | "title"> &
    Partial<Pick<Campaign, "template" | "slug">>;
  /** Render with this template instead of the campaign's own (used for previews of unsaved designs). */
  template?: TemplateConfig;
  /** Render only this block while retaining campaign-wide context (used by focused style previews). */
  focusBlockId?: string;
  mode: PosterMode;
  selectedId?: string | null;
  /** Element inside the selected block (headline, button, photo…), or null when the whole block is selected. */
  selectedElement?: ElementKey | null;
  flashId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Clicking a single text, button or photo in the editor selects just that element. */
  onSelectElement?: (blockId: string, key: ElementKey) => void;
  onEdit?: (blockId: string, patch: Partial<BlockContent>) => void;
  onCtaClick?: (block: Block) => void;
  className?: string;
}

const DETAIL_ICONS: Record<DetailIcon, typeof CalendarDays> = {
  date: CalendarDays,
  time: Clock,
  location: MapPin,
  phone: Phone,
  price: Tag,
  info: Info,
};
const SOCIAL_ICONS: Record<SocialPlatform, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  x: Twitter,
  whatsapp: MessageCircle,
  website: Globe,
};

export function ctaHref(block: Block): string | null {
  const c = block.content;
  switch (c.action) {
    case "whatsapp":
      return c.target ? whatsappLink(c.target, c.message) : null;
    case "url":
      return safeUrl(c.target);
    case "phone":
      return c.target ? `tel:${c.target.replace(/[^\d+]/g, "")}` : null;
    case "email":
      return c.target ? `mailto:${c.target}` : null;
    default:
      return null;
  }
}

export function PosterRenderer({
  campaign,
  template,
  focusBlockId,
  mode,
  selectedId,
  selectedElement,
  flashId,
  onSelect,
  onSelectElement,
  onEdit,
  onCtaClick,
  className,
}: PosterProps) {
  const { theme } = campaign;
  useTemplateCollections(); // re-render when a template this poster uses is saved
  const [hostedTemplate, setHostedTemplate] = useState<TemplateConfig | undefined>();
  const templateId = campaign.template?.id;
  const templateVersion = campaign.template?.version;
  const [publicOrigin, setPublicOrigin] = useState(
    () => import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://slug.bio",
  );
  useEffect(() => setPublicOrigin(window.location.origin), []);
  useEffect(() => {
    setHostedTemplate(undefined);
    if (
      !templateId ||
      !templateVersion ||
      template ||
      hasTemplate({ id: templateId, version: templateVersion }) ||
      !isSupabaseConfigured()
    )
      return;
    let live = true;
    void getHostedTemplateVersion(templateId, templateVersion)
      .then((config) => {
        if (live) setHostedTemplate(config);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [template, templateId, templateVersion]);
  const tpl = template ?? hostedTemplate ?? getTemplateConfig(campaign.template);
  const L = useMemo(() => renderLayout(tpl), [tpl]);
  const styleFacts = useMemo(
    () => styleContext(campaign.blocks, campaign.slug, publicOrigin),
    [campaign.blocks, campaign.slug, publicOrigin],
  );
  const renderedBlocks = campaign.blocks
    .filter((b) => !focusBlockId || b.id === focusBlockId)
    .filter((b) => L.supported.has(b.type));
  const editing = mode === "edit";
  const interactive = mode === "preview" || mode === "public";

  const vars = {
    "--p-bg": theme.bg,
    "--p-surface": theme.surface,
    "--p-text": theme.text,
    "--p-muted": theme.muted,
    "--p-accent": theme.accent,
    "--p-accent-text": theme.accentText,
    ...accentInkVars(theme.accent, theme.bg, theme.surface, theme.text),
    "--p-radius": `${theme.radius}px`,
    "--p-display": POSTER_FONTS[theme.displayFont ?? theme.font]?.family,
    ...L.vars,
    fontFamily: POSTER_FONTS[theme.font]?.family,
    background: theme.bg,
    color: theme.text,
  } as CSSProperties;

  const handleCta = (b: Block) => {
    if (!interactive) return;
    onCtaClick?.(b);
    if (b.content.action === "form") {
      const form = campaign.blocks.find((x) => x.type === "form");
      const googleFormUrl = safeGoogleFormUrl(form?.content.googleFormUrl);
      if (googleFormUrl) {
        window.open(googleFormUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }
    const href = ctaHref(b);
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "@container relative w-full overflow-hidden",
        focusBlockId && "flex flex-col justify-center",
        className,
      )}
      style={{ ...vars, ...(focusBlockId ? { aspectRatio: "4 / 5" } : {}) }}
      onClick={editing ? () => onSelect?.(null) : undefined}
    >
      {renderedBlocks.map((b, i) => {
        const resolved = resolveBlockStyle(b, L.styles[b.type], styleFacts);
        const blockLayout = resolved
          ? { ...L, styles: { ...L.styles, [b.type]: resolved.style.id } }
          : L;
        return (
          <BlockFrame
            key={b.id}
            block={b}
            theme={theme}
            divider={L.dividers && i > 0 && b.type !== "footer"}
            editing={editing}
            selected={selectedId === b.id}
            element={selectedId === b.id ? (selectedElement ?? null) : null}
            flash={flashId === b.id}
            onSelect={onSelect}
          >
            <BlockBody
              block={b}
              theme={theme}
              L={blockLayout}
              mode={mode}
              styleFacts={styleFacts}
              onEdit={onEdit}
              onCta={handleCta}
              selectedEl={selectedId === b.id ? (selectedElement ?? null) : null}
              onPickEl={editing ? onSelectElement : undefined}
            />
          </BlockFrame>
        );
      })}
      {renderedBlocks.length === 0 && (
        <div
          className="flex min-h-[420px] flex-col items-center justify-center gap-2 p-10 text-center"
          style={{ color: theme.muted }}
        >
          <div className="text-lg font-semibold">This poster is empty</div>
          <div className="text-sm">Add a block or ask the assistant to build one.</div>
        </div>
      )}
    </div>
  );
}

/**
 * Accent used as text: `--p-accent-ink` for small text (4.5:1 on the page) and `--p-accent-display`
 * for big text on surfaces (3:1). Falls back to the text colour when the accent is too faint, e.g. lime on cream.
 */
function accentInkVars(accent: string, bg: string, surface: string, text: string) {
  return {
    "--p-accent-ink": readableAccent(accent, bg, text, 4.5),
    "--p-accent-display": readableAccent(accent, surface, text, 3),
  };
}

function BlockFrame({
  block,
  theme,
  divider,
  editing,
  selected,
  element,
  flash,
  onSelect,
  children,
}: {
  block: Block;
  theme: Theme;
  divider: boolean;
  editing: boolean;
  selected: boolean;
  element: ElementKey | null;
  flash: boolean;
  onSelect?: (id: string | null) => void;
  children: ReactNode;
}) {
  const elLabel = elementMeta(block.type, element)?.label;
  const s = block.style;
  const style = {
    ...(s.bg ? { "--p-bg": s.bg, background: s.bg } : {}),
    ...(s.text ? { "--p-text": s.text, color: s.text } : {}),
    ...(s.accent ? { "--p-accent": s.accent } : {}),
    ...(s.bg || s.text || s.accent
      ? accentInkVars(
          s.accent ?? theme.accent,
          s.bg ?? theme.bg,
          theme.surface,
          s.text ?? theme.text,
        )
      : {}),
    ...(divider ? { borderTop: RULE } : {}),
  } as CSSProperties;
  return (
    <section
      data-block-id={block.id}
      style={style}
      className={cn(
        "relative scroll-mt-3 [--p-pad:var(--p-pad-m,1)] @2xl:[--p-pad:var(--p-pad-d,1)]",
        editing && "cursor-pointer outline-offset-[-2px] transition-[outline-color]",
        editing &&
          !selected &&
          "outline-2 outline-dashed outline-transparent hover:outline-primary/60",
        editing && selected && !elLabel && "outline-[3px] outline-solid outline-primary",
        editing && selected && elLabel && "outline-2 outline-dashed outline-primary/50",
        flash && "animate-block-flash",
      )}
      onClick={
        editing
          ? (e) => {
              e.stopPropagation();
              onSelect?.(block.id);
            }
          : undefined
      }
    >
      {editing && selected && (
        <span className="pointer-events-none absolute top-0 left-0 z-20 rounded-br-lg bg-primary px-2.5 py-1 text-[11px] font-bold tracking-wide text-primary-foreground uppercase">
          {BLOCK_META[block.type].label}
          {elLabel && elLabel !== BLOCK_META[block.type].label && (
            <span className="opacity-80"> › {elLabel}</span>
          )}
        </span>
      )}
      {children}
    </section>
  );
}

const RULE = "1px solid color-mix(in oklab, var(--p-text) 14%, transparent)";
/** Vertical padding scaled by the template's phone / wide-screen spacing. */
const padY = (px: number) => `calc(${px}px * var(--p-pad, 1))`;

function OfferCountdown({ endsAt, active }: { endsAt?: string; active: boolean }) {
  const end = useMemo(() => parseEndsAt(endsAt), [endsAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || !end || end.getTime() <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active, end]);
  if (!end || end.getTime() <= now) return null;
  const total = Math.floor((end.getTime() - now) / 1000);
  const parts = [
    ["Days", Math.floor(total / 86400)],
    ["Hours", Math.floor((total % 86400) / 3600)],
    ["Minutes", Math.floor((total % 3600) / 60)],
    ["Seconds", total % 60],
  ] as const;
  return (
    <div
      className="mt-3 flex flex-wrap gap-2"
      role="timer"
      aria-label={`Offer ends ${end.toLocaleString()}`}
    >
      {parts.map(([label, value]) => (
        <div
          key={label}
          className="min-w-14 rounded-lg bg-[color-mix(in_oklab,var(--p-accent)_12%,transparent)] px-2.5 py-2 text-center"
        >
          <div className="font-mono text-xl leading-none font-bold tabular-nums">
            {String(value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[9px] font-bold tracking-widest uppercase opacity-70">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

function headingStyle(b: Block, base: string, L: RenderLayout): CSSProperties {
  return {
    fontFamily: "var(--p-display)",
    fontSize: `calc(${base} * ${b.style.headingScale})`,
    fontWeight: b.style.headingWeight,
    textTransform: b.style.uppercase || L.uppercase ? "uppercase" : undefined,
    lineHeight: 1.05,
    letterSpacing:
      L.tracking === "tight"
        ? "-0.04em"
        : L.tracking === "wide"
          ? "0"
          : b.style.headingWeight >= 800
            ? "-0.035em"
            : "-0.02em",
    textAlign: b.style.align,
  };
}

/** Panels (offer, detail cards, social icons) drawn in the template's surface style. */
function surfaceStyle(L: RenderLayout, maxRadius: number): CSSProperties {
  const radius = `min(var(--p-radius), ${maxRadius}px)`;
  if (L.surface === "outline")
    return {
      background: "transparent",
      border: "1.5px solid color-mix(in oklab, var(--p-text) 22%, transparent)",
      borderRadius: radius,
    };
  if (L.surface === "plain")
    return { background: "transparent", borderLeft: "3px solid var(--p-accent)", borderRadius: 0 };
  return { background: "var(--p-surface)", borderRadius: radius };
}

function Eyebrow({
  L,
  onPhoto,
  ...props
}: React.ComponentProps<typeof EditableText> & { L: RenderLayout; onPhoto?: boolean }) {
  if (L.eyebrow === "text") {
    return (
      <EditableText
        {...props}
        style={{
          color: onPhoto ? "inherit" : "var(--p-accent-ink)",
          textShadow: onPhoto ? undefined : "none",
          ...props.style,
        }}
        className="text-[12px] font-bold tracking-[0.18em] uppercase"
      />
    );
  }
  return (
    <EditableText
      {...props}
      style={{
        background: "var(--p-accent)",
        color: "var(--p-accent-text)",
        textShadow: "none",
        ...props.style,
      }}
      className="rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase"
    />
  );
}

type BodyProps = {
  block: Block;
  theme: Theme;
  L: RenderLayout;
  mode: PosterMode;
  styleFacts: StyleContext;
  onEdit?: PosterProps["onEdit"];
  onCta: (b: Block) => void;
  selectedEl?: ElementKey | null;
  onPickEl?: PosterProps["onSelectElement"];
};

/** Props that make a text element selectable, formatted and inline-editable. */
function textProps(
  b: Block,
  k: ElementKey,
  editing: boolean,
  onEdit: PosterProps["onEdit"],
  selectedEl: ElementKey | null | undefined,
  onPickEl: PosterProps["onSelectElement"],
  style?: CSSProperties,
) {
  return {
    editable: editing,
    value: b.content[k] ?? "",
    onChange: (v: string) => onEdit?.(b.id, { [k]: v } as Partial<BlockContent>),
    style: { ...style, ...elementCss(b, k) },
    elementKey: k,
    selected: selectedEl === k,
    onActivate: onPickEl ? () => onPickEl(b.id, k) : undefined,
  };
}

/** Click handling and outline for a photo or button element in the editor. */
function pickable(
  b: Block,
  k: ElementKey,
  selectedEl: ElementKey | null | undefined,
  onPickEl: PosterProps["onSelectElement"],
) {
  if (!onPickEl) return {};
  return {
    "data-el": k,
    "aria-selected": selectedEl === k,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onPickEl(b.id, k);
    },
  };
}

function BlockBody({
  block: b,
  theme,
  L,
  mode,
  styleFacts,
  onEdit,
  onCta,
  selectedEl,
  onPickEl,
}: BodyProps) {
  const editing = mode === "edit";
  const c = b.content;
  const align = b.style.align;
  const pad = { paddingTop: padY(b.style.padding), paddingBottom: padY(b.style.padding) };
  const H = (base: string) => headingStyle(b, base, L);
  const T = (k: ElementKey, style?: CSSProperties) =>
    textProps(b, k, editing, onEdit, selectedEl, onPickEl, style);
  const alignCls = align === "center" ? "text-center items-center" : "text-left items-start";

  switch (b.type) {
    case "hero": {
      const img = resolveImage(c.image);
      const heroStyle = L.styles.hero;
      const overlay = c.overlay ?? 0.35;
      // Dark pages fade the photo into the page and keep their light text. Light pages would put dark text
      // on a darkened photo, so they get light text over a deeper scrim and fade to the page below the text.
      const lightPage = !isDark(b.style.bg ?? theme.bg) && !b.style.text;
      const heroText = lightPage ? "#ffffff" : (b.style.text ?? "var(--p-text)");
      const heroScrim = lightPage
        ? `linear-gradient(to bottom, rgba(0,0,0,${overlay * 0.3}) 0%, rgba(0,0,0,${Math.max(overlay, 0.42)}) 40%, rgba(0,0,0,${Math.min(0.82, Math.max(overlay + 0.3, 0.68))}) 100%)`
        : `linear-gradient(to bottom, rgba(0,0,0,${overlay * 0.4}) 0%, rgba(0,0,0,${overlay}) 55%, var(--p-bg) 100%)`;
      if (!img || heroStyle === "hero.typographic") {
        return (
          <div
            className={cn(
              "relative flex flex-col gap-4 px-6 @2xl:px-14",
              alignCls,
              heroStyle === "hero.colour-block" &&
                "bg-[var(--p-accent)] text-[var(--p-accent-text)]",
              heroStyle === "hero.gradient" &&
                "bg-gradient-to-br from-[var(--p-accent)]/25 via-transparent to-[var(--p-surface)]",
              heroStyle === "hero.neon" &&
                "bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:28px_28px]",
            )}
            style={{
              ...pad,
              paddingTop: padY(b.style.padding + 24),
              ...(heroStyle === "hero.gradient" ? { backgroundColor: "var(--p-bg)" } : {}),
              ...(heroStyle === "hero.neon"
                ? { textShadow: "0 0 18px color-mix(in oklab,var(--p-accent) 75%,transparent)" }
                : {}),
            }}
          >
            {heroStyle === "hero.typographic" && (
              <span aria-hidden className="h-1 w-14 rounded-full bg-[var(--p-accent)]" />
            )}
            {(c.eyebrow || editing) && <Eyebrow L={L} {...T("eyebrow")} placeholder="Tag" />}
            <EditableText
              as="h1"
              {...T("headline", H("clamp(36px, 11cqi, 84px)"))}
              placeholder="Headline"
              className="max-w-[16ch] w-full"
            />
            <EditableText
              {...T("subtitle", { color: "var(--p-muted)" })}
              placeholder="Subtitle"
              multiline
              className="max-w-[46ch] text-[17px] leading-relaxed @2xl:text-xl"
            />
          </div>
        );
      }
      if (
        heroStyle === "hero.editorial" ||
        heroStyle === "hero.floating" ||
        heroStyle === "hero.minimal"
      ) {
        return (
          <div
            className={cn("flex flex-col gap-5 px-6 @2xl:px-14", alignCls)}
            style={{ ...pad, paddingTop: padY(24) }}
          >
            <div
              className={cn("relative w-full overflow-hidden", onPickEl && "cursor-pointer")}
              style={{
                height: Math.round(
                  (c.imageHeight ?? 380) * (heroStyle === "hero.minimal" ? 0.55 : 0.8),
                ),
                borderRadius: heroStyle === "hero.floating" ? 999 : "min(var(--p-radius), 28px)",
                marginInline: heroStyle === "hero.floating" ? "auto" : undefined,
                width: heroStyle === "hero.floating" ? "78%" : undefined,
                boxShadow:
                  heroStyle === "hero.floating"
                    ? "0 24px 60px color-mix(in oklab,var(--p-text) 20%,transparent)"
                    : undefined,
              }}
              {...pickable(b, "image", selectedEl, onPickEl)}
            >
              <img
                src={img}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading={mode === "thumb" ? "lazy" : "eager"}
              />
              <div
                className="absolute inset-0"
                style={{ background: `rgba(0,0,0,${overlay * 0.25})` }}
              />
              {onPickEl && selectedEl === "image" && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[15] ring-[3px] ring-primary ring-inset"
                />
              )}
            </div>
            <div className={cn("flex w-full flex-col gap-4 pt-2", alignCls)}>
              {(c.eyebrow || editing) && <Eyebrow L={L} {...T("eyebrow")} placeholder="Tag" />}
              <EditableText
                as="h1"
                {...T("headline", H("clamp(34px, 10cqi, 80px)"))}
                placeholder="Headline"
                className="w-full max-w-[18ch]"
              />
              <EditableText
                {...T("subtitle", { color: "var(--p-muted)" })}
                placeholder="Subtitle"
                multiline
                className="max-w-[46ch] text-[17px] leading-relaxed @2xl:text-xl"
              />
            </div>
          </div>
        );
      }
      if (
        heroStyle === "hero.colour-block" ||
        heroStyle === "hero.split" ||
        heroStyle === "hero.gradient"
      ) {
        const colourBlock = heroStyle === "hero.colour-block";
        const gradient = heroStyle === "hero.gradient";
        return (
          <div className="grid @2xl:grid-cols-2" style={{ minHeight: c.imageHeight ?? 380 }}>
            <div
              className={cn("flex flex-col justify-center gap-4 px-6 @2xl:px-12", alignCls)}
              style={{
                ...pad,
                background: colourBlock
                  ? "var(--p-accent)"
                  : gradient
                    ? "radial-gradient(ellipse at top left,color-mix(in oklab,var(--p-accent) 30%,var(--p-bg)),var(--p-bg) 72%)"
                    : "var(--p-surface)",
                color: colourBlock ? "var(--p-accent-text)" : "var(--p-text)",
              }}
            >
              {(c.eyebrow || editing) && <Eyebrow L={L} {...T("eyebrow")} placeholder="Tag" />}
              <EditableText
                as="h1"
                {...T("headline", H("clamp(34px, 9cqi, 72px)"))}
                placeholder="Headline"
                className="w-full"
              />
              <EditableText
                {...T("subtitle", {
                  color: colourBlock
                    ? "color-mix(in oklab,var(--p-accent-text) 78%,transparent)"
                    : "var(--p-muted)",
                })}
                placeholder="Subtitle"
                multiline
                className="max-w-[42ch] text-[16px] leading-relaxed"
              />
            </div>
            <div
              className="relative min-h-64 overflow-hidden"
              {...pickable(b, "image", selectedEl, onPickEl)}
            >
              <img
                src={img}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading={mode === "thumb" ? "lazy" : "eager"}
              />
              {heroStyle === "hero.split" && (
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--p-bg)]/20 to-transparent" />
              )}
              {gradient && (
                <div className="absolute inset-5 rounded-[min(var(--p-radius),32px)] border border-white/30 shadow-2xl" />
              )}
              {onPickEl && selectedEl === "image" && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[15] ring-[3px] ring-primary ring-inset"
                />
              )}
            </div>
          </div>
        );
      }
      return (
        <div
          className={cn(
            "relative flex flex-col justify-end overflow-hidden",
            heroStyle === "hero.neon" &&
              "ring-1 ring-[var(--p-accent)] shadow-[0_0_30px_color-mix(in_oklab,var(--p-accent)_35%,transparent)]",
            heroStyle === "hero.split" && "@2xl:flex-row @2xl:items-stretch",
            heroStyle === "hero.colour-block" && "bg-[var(--p-accent)]",
          )}
          style={{
            minHeight: c.imageHeight ?? 380,
            ...(heroStyle === "hero.gradient"
              ? { background: "radial-gradient(ellipse at top,var(--p-accent),var(--p-bg) 70%)" }
              : {}),
          }}
          {...pickable(b, "image", selectedEl, onPickEl)}
        >
          {onPickEl && selectedEl === "image" && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[15] ring-[3px] ring-primary ring-inset"
            />
          )}
          <img
            src={img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading={mode === "thumb" ? "lazy" : "eager"}
          />
          {heroStyle === "hero.collage" && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-8 right-6 z-[2] h-24 w-20 rotate-6 overflow-hidden rounded-xl border-4 border-white shadow-xl @2xl:right-12 @2xl:h-36 @2xl:w-28"
            >
              <img src={img} alt="" className="h-full w-full scale-150 object-cover object-right" />
            </div>
          )}
          {heroStyle === "hero.collage" && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-8 left-6 z-[2] h-16 w-20 -rotate-6 border-4 border-[var(--p-bg)] shadow-xl @2xl:left-12"
              style={{ background: "var(--p-accent)" }}
            />
          )}
          <div className="absolute inset-0" style={{ background: heroScrim }} />
          <div
            className={cn("relative z-10 flex flex-col gap-4 px-6 @2xl:px-14", alignCls)}
            style={{
              paddingTop: (c.imageHeight ?? 380) * 0.45,
              paddingBottom: padY(b.style.padding),
              color: heroText,
              textShadow: lightPage ? "0 1px 16px rgba(0,0,0,0.35)" : undefined,
            }}
          >
            {(c.eyebrow || editing) && (
              <Eyebrow L={L} onPhoto {...T("eyebrow")} placeholder="Tag" />
            )}
            <EditableText
              as="h1"
              {...T("headline", H("clamp(36px, 11cqi, 84px)"))}
              placeholder="Headline"
              className="w-full max-w-[16ch] drop-shadow-sm"
            />
            <EditableText
              {...T("subtitle")}
              placeholder="Subtitle"
              multiline
              className="max-w-[46ch] text-[17px] leading-relaxed opacity-90 @2xl:text-xl"
            />
          </div>
          {lightPage && (
            <div
              aria-hidden
              className="relative h-10"
              style={{ background: "linear-gradient(to bottom, transparent, var(--p-bg))" }}
            />
          )}
        </div>
      );
    }
    case "text":
      return (
        <div
          className={cn("mx-auto flex flex-col gap-3 px-6 @2xl:px-14", alignCls)}
          style={{ ...pad, maxWidth: "calc(48rem * var(--p-wf, 1))" }}
        >
          {(c.heading || editing) && (
            <EditableText
              as="h2"
              {...T("heading", H("clamp(24px, 7cqi, 44px)"))}
              placeholder="Heading"
              className="w-full"
            />
          )}
          <EditableText
            {...T("body", { color: "var(--p-muted)", textAlign: align, whiteSpace: "pre-line" })}
            placeholder="Write something…"
            multiline
            className="w-full text-[16px] leading-[1.65] @2xl:text-lg"
          />
        </div>
      );
    case "image": {
      const img = resolveImage(c.image);
      const imageStyle = L.styles.image;
      const framed = imageStyle === "image.framed" || imageStyle === "image.polaroid";
      const imageHeight =
        imageStyle === "image.circular"
          ? Math.min(c.imageHeight ?? 280, 320)
          : (c.imageHeight ?? 280);
      return (
        <figure
          className={cn(
            "relative flex flex-col gap-2 px-6 @2xl:px-14",
            alignCls,
            imageStyle === "image.full-bleed" && "px-0",
            imageStyle === "image.offset" && "translate-x-2",
            imageStyle === "image.polaroid" && "bg-white p-3 pb-8 text-zinc-900 shadow-xl",
            imageStyle === "image.framed" && "border p-2",
            imageStyle === "image.circular" && "mx-auto w-[min(100%,20rem)]",
          )}
          style={{
            ...pad,
            ...(imageStyle === "image.framed"
              ? { borderColor: "color-mix(in oklab,var(--p-text) 20%,transparent)" }
              : {}),
          }}
        >
          <div
            className={cn(
              "w-full",
              onPickEl && "cursor-pointer outline-offset-2",
              onPickEl &&
                (selectedEl === "image"
                  ? "outline-[3px] outline-solid outline-primary"
                  : "outline-2 outline-dashed outline-transparent hover:outline-primary/70"),
            )}
            style={{
              borderRadius:
                imageStyle === "image.organic"
                  ? "44% 56% 58% 42% / 48% 38% 62% 52%"
                  : imageStyle === "image.circular"
                    ? "999px"
                    : c.rounded
                      ? Math.min(theme_radius(), 28)
                      : 0,
              overflow: "hidden",
            }}
            {...pickable(b, "image", selectedEl, onPickEl)}
          >
            {img ? (
              <img
                src={img}
                alt={c.caption || ""}
                loading="lazy"
                className="w-full object-cover"
                style={{
                  height: imageStyle === "image.circular" ? imageHeight : (c.imageHeight ?? 280),
                  aspectRatio: imageStyle === "image.circular" ? "1 / 1" : undefined,
                  filter:
                    imageStyle === "image.duotone"
                      ? "grayscale(1) sepia(.3) contrast(1.12)"
                      : undefined,
                  borderRadius:
                    imageStyle === "image.organic"
                      ? "inherit"
                      : imageStyle === "image.circular"
                        ? "999px"
                        : c.rounded
                          ? Math.min(theme_radius(), 28)
                          : 0,
                }}
              />
            ) : (
              <div
                className="flex w-full items-center justify-center text-sm"
                style={{
                  height: c.imageHeight ?? 280,
                  background: "var(--p-surface)",
                  color: "var(--p-muted)",
                  borderRadius: 16,
                }}
              >
                No image yet
              </div>
            )}
            {imageStyle === "image.collage" && img && (
              <div
                aria-hidden
                className="pointer-events-none absolute right-3 bottom-3 z-[2] flex -space-x-5"
              >
                <span className="h-16 w-12 rotate-[-8deg] overflow-hidden rounded-md border-4 border-white shadow-xl">
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full scale-150 object-cover object-left"
                  />
                </span>
                <span className="h-16 w-12 rotate-[7deg] overflow-hidden rounded-md border-4 border-white shadow-xl">
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full scale-150 object-cover object-right"
                  />
                </span>
              </div>
            )}
          </div>
          {(c.caption || editing) && (
            <EditableText
              as="figcaption"
              {...T("caption", {
                color:
                  imageStyle === "image.text-overlay"
                    ? "#ffffff"
                    : imageStyle === "image.polaroid"
                      ? "#18181b"
                      : "var(--p-muted)",
                textAlign: align,
              })}
              placeholder="Add a caption"
              className={cn(
                "w-full text-sm",
                imageStyle === "image.text-overlay" &&
                  "absolute right-8 bottom-5 left-8 z-10 rounded-lg bg-black/60 px-4 py-3 text-white",
              )}
            />
          )}
        </figure>
      );
    }
    case "offer": {
      const isBurst = L.styles.offer === "offer.burst";
      const isSticker = L.styles.offer === "offer.sticker";
      const priceStyle = {
        ...H(
          L.styles.offer === "offer.luxury"
            ? "clamp(42px, 14cqi, 82px)"
            : "clamp(40px, 13cqi, 76px)",
        ),
        color: isSticker ? "var(--p-accent-text)" : "var(--p-accent-display)",
        filter: "saturate(1.1)",
        fontFamily: L.styles.offer === "offer.luxury" ? "var(--p-display)" : undefined,
      };
      const originalPrice = (className = "text-xl opacity-60") =>
        (c.originalPrice || editing) && (
          <EditableText
            {...T("originalPrice", { textDecorationLine: "line-through" })}
            placeholder="Was"
            className={className}
          />
        );
      const price = () => <EditableText {...T("price", priceStyle)} placeholder="Price" />;
      return (
        <div className="px-6 @2xl:px-14" style={pad}>
          <div
            className={cn(
              "mx-auto flex flex-col gap-2 p-7",
              alignCls,
              L.styles.offer === "offer.gradient" &&
                "bg-gradient-to-br from-[var(--p-accent)]/20 via-[var(--p-surface)] to-transparent",
              isSticker && "relative shadow-xl",
              L.styles.offer === "offer.burst" &&
                "ring-2 ring-[var(--p-accent)] ring-offset-4 ring-offset-[var(--p-bg)]",
              L.styles.offer === "offer.ticket" &&
                "border-2 border-dashed border-[var(--p-accent)]",
              L.styles.offer === "offer.luxury" &&
                "border-4 border-double border-[var(--p-accent)] px-9 py-10",
            )}
            style={{
              ...(L.styles.offer === "offer.minimal"
                ? {
                    background: "transparent",
                    borderTop: "2px solid var(--p-accent)",
                    borderBottom: "2px solid var(--p-accent)",
                  }
                : surfaceStyle(L, 28)),
              maxWidth: "calc(36rem * var(--p-wf, 1))",
              ...(L.styles.offer === "offer.ticket"
                ? {
                    backgroundImage:
                      "radial-gradient(circle at 0 50%, var(--p-bg) 7px, transparent 8px), radial-gradient(circle at 100% 50%, var(--p-bg) 7px, transparent 8px)",
                  }
                : {}),
            }}
          >
            <EditableText
              {...T("heading", { color: "var(--p-muted)" })}
              placeholder="Offer label"
              className="text-xs font-bold tracking-[0.14em] uppercase"
            />
            <div
              className={cn(
                "flex flex-wrap items-baseline gap-3",
                align === "center" && "justify-center",
                (isBurst || isSticker) && "items-center",
                isSticker && "@2xl:pr-32",
              )}
            >
              {isSticker ? (
                <div
                  className="relative z-10 flex min-h-32 min-w-32 rotate-6 flex-col items-center justify-center rounded-full px-5 py-4 text-center shadow-lg ring-4 ring-[var(--p-bg)] @2xl:absolute @2xl:top-[-1.25rem] @2xl:right-[-1.25rem]"
                  style={{ background: "var(--p-accent)", color: "var(--p-accent-text)" }}
                >
                  {price()}
                  {originalPrice("text-sm opacity-75")}
                </div>
              ) : (
                <>
                  {price()}
                  {originalPrice()}
                </>
              )}
              {isBurst && (
                <div
                  role="img"
                  aria-label="Special offer"
                  className="flex h-20 w-20 shrink-0 -rotate-6 flex-col items-center justify-center text-center text-[10px] font-black leading-tight tracking-wider"
                  style={{
                    background: "var(--p-accent)",
                    color: "var(--p-accent-text)",
                    clipPath:
                      "polygon(50% 0%,61% 10%,75% 3%,80% 17%,93% 25%,90% 40%,100% 50%,90% 60%,93% 75%,80% 83%,75% 97%,61% 90%,50% 100%,39% 90%,25% 97%,20% 83%,7% 75%,10% 60%,0% 50%,10% 40%,7% 25%,20% 17%,25% 3%,39% 10%)",
                  }}
                >
                  <span>SPECIAL</span>
                  <span>OFFER</span>
                </div>
              )}
            </div>
            <EditableText
              {...T("note", { color: "var(--p-muted)" })}
              placeholder="Note"
              className="text-[15px]"
            />
            {L.styles.offer === "offer.countdown" && (
              <OfferCountdown endsAt={c.endsAt} active={mode === "public" || mode === "preview"} />
            )}
          </div>
        </div>
      );
    }
    case "details": {
      const detailStyle = L.styles.details;
      const detailItems = c.items ?? [];
      const orderedDetailItems =
        detailStyle === "details.location"
          ? [...detailItems].sort(
              (a, b) => Number(b.icon === "location") - Number(a.icon === "location"),
            )
          : detailItems;
      return (
        <div
          className="mx-auto px-6 @2xl:px-14"
          style={{ ...pad, maxWidth: "calc(56rem * var(--p-wf, 1))" }}
        >
          {(c.heading || editing) && (
            <EditableText
              as="h2"
              {...T("heading", H("clamp(22px, 6cqi, 36px)"))}
              placeholder="Heading"
              className="mb-5 w-full"
            />
          )}
          {detailStyle === "details.icon-list" ||
          detailStyle === "details.minimal-list" ||
          detailStyle === "details.timeline" ? (
            <div
              className={cn(
                "flex flex-col",
                detailStyle === "details.timeline" &&
                  "ml-2 border-l-2 border-[var(--p-accent)] pl-5",
              )}
              style={{ borderTop: detailStyle === "details.timeline" ? undefined : RULE }}
            >
              {(c.items ?? []).map((it) => {
                const Icon = DETAIL_ICONS[it.icon] ?? Info;
                return (
                  <div
                    key={it.id}
                    className={cn(
                      "relative flex items-center gap-4 py-3.5",
                      detailStyle === "details.timeline" &&
                        "before:absolute before:top-1/2 before:-left-[27px] before:h-3 before:w-3 before:-translate-y-1/2 before:rounded-full before:bg-[var(--p-accent)]",
                      detailStyle === "details.minimal-list" &&
                        "justify-between gap-6 border-b border-dotted border-[color-mix(in_oklab,var(--p-text)_35%,transparent)]",
                    )}
                    style={{ borderBottom: detailStyle === "details.icon-list" ? RULE : undefined }}
                  >
                    {detailStyle !== "details.minimal-list" && (
                      <Icon className="h-5 w-5 shrink-0" style={{ color: "var(--p-accent-ink)" }} />
                    )}
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5",
                        detailStyle === "details.minimal-list" && "contents",
                      )}
                    >
                      <span
                        className="text-[11px] font-bold tracking-[0.12em] uppercase"
                        style={{ color: "var(--p-muted)" }}
                      >
                        {it.label}
                      </span>
                      <span className="min-w-0 text-[16px] font-semibold break-words">
                        {it.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-3 @2xl:[grid-template-columns:var(--p-dcols)]",
                detailStyle === "details.grid" &&
                  "grid-cols-2 border-l border-t border-[color-mix(in_oklab,var(--p-text)_20%,transparent)]",
                detailStyle === "details.columns" &&
                  "@2xl:[grid-template-columns:repeat(2,minmax(0,1fr))]",
              )}
              style={
                detailStyle === "details.location"
                  ? ({ "--p-dcols": "minmax(0, 1.2fr) minmax(0, 1fr)" } as CSSProperties)
                  : undefined
              }
            >
              {orderedDetailItems.map((it, index) => {
                const Icon = DETAIL_ICONS[it.icon] ?? Info;
                const calendarDate =
                  detailStyle === "details.calendar" && it.icon === "date"
                    ? parseEndsAt(it.value)
                    : null;
                return (
                  <div
                    key={it.id}
                    className={cn(
                      "flex items-center gap-4 p-4",
                      detailStyle === "details.grid" &&
                        "border-b border-r border-[color-mix(in_oklab,var(--p-text)_20%,transparent)]",
                      detailStyle === "details.columns" &&
                        "border-l border-[color-mix(in_oklab,var(--p-text)_18%,transparent)]",
                      detailStyle === "details.location" &&
                        it.icon === "location" &&
                        "bg-[color-mix(in_oklab,var(--p-accent)_12%,transparent)]",
                      detailStyle === "details.calendar" &&
                        it.icon === "date" &&
                        "relative flex-col items-start gap-2 overflow-hidden border-t-4 border-[var(--p-accent)] text-left",
                      detailStyle === "details.location" &&
                        it.icon === "location" &&
                        "relative min-h-44 flex-col items-start overflow-hidden @2xl:row-span-2 @2xl:min-h-full",
                    )}
                    style={
                      detailStyle === "details.grid" || detailStyle === "details.columns"
                        ? { background: "transparent", borderRadius: 0 }
                        : detailStyle === "details.location" && it.icon === "location"
                          ? {
                              ...surfaceStyle(L, 20),
                              backgroundImage:
                                "linear-gradient(32deg, transparent 46%, color-mix(in oklab,var(--p-accent) 18%,transparent) 47% 50%, transparent 51%), linear-gradient(90deg, color-mix(in oklab,var(--p-text) 7%,transparent) 1px, transparent 1px), linear-gradient(color-mix(in oklab,var(--p-text) 7%,transparent) 1px, transparent 1px)",
                              backgroundSize: "100% 100%, 28px 28px, 28px 28px",
                            }
                          : surfaceStyle(L, 20)
                    }
                  >
                    {detailStyle === "details.grid" && (
                      <span className="self-start font-mono text-xs font-bold text-[var(--p-accent-ink)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                    {detailStyle !== "details.grid" && (
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                          detailStyle === "details.calendar" &&
                            it.icon === "date" &&
                            "h-16 w-16 rounded-xl",
                          detailStyle === "details.location" &&
                            it.icon === "location" &&
                            "h-14 w-14 rounded-2xl shadow-md",
                        )}
                        style={{
                          background: "var(--p-accent)",
                          color: "var(--p-accent-text)",
                        }}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            detailStyle === "details.location" &&
                              it.icon === "location" &&
                              "h-7 w-7",
                          )}
                        />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div
                        className="text-[11px] font-bold tracking-[0.12em] uppercase"
                        style={{ color: "var(--p-muted)" }}
                      >
                        {it.label}
                      </div>
                      {calendarDate ? (
                        <>
                          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                            <span className="text-4xl font-black leading-none tracking-tight @2xl:text-5xl">
                              {calendarDate.getDate()}
                            </span>
                            <span className="text-lg font-bold">
                              {calendarDate.toLocaleDateString(undefined, { month: "long" })}
                            </span>
                            <span
                              className="text-sm font-semibold"
                              style={{ color: "var(--p-muted)" }}
                            >
                              {calendarDate.getFullYear()}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-medium">{it.value}</div>
                        </>
                      ) : (
                        <div className="text-[16px] font-semibold">{it.value}</div>
                      )}
                      {detailStyle === "details.location" &&
                        it.icon === "location" &&
                        (mode === "edit" ? (
                          <span
                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold"
                            style={{ color: "var(--p-accent-ink)" }}
                          >
                            Get directions <ArrowUpRight className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.value)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold underline underline-offset-4"
                            style={{ color: "var(--p-accent-ink)" }}
                          >
                            Get directions <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    case "cta": {
      const ctaStyle = L.styles.cta;
      const hint =
        c.action === "whatsapp"
          ? "Opens WhatsApp"
          : c.action === "form"
            ? "Opens the linked Google Form"
            : c.action === "phone"
              ? "Calls directly"
              : c.action === "email"
                ? "Opens email"
                : c.target
                  ? "Opens link"
                  : "";
      const ActionIcon =
        c.action === "whatsapp"
          ? MessageCircle
          : c.action === "phone"
            ? Phone
            : c.action === "email"
              ? Mail
              : c.action === "url"
                ? ExternalLink
                : ArrowUpRight;
      // Thumbnails sit inside clickable cards, so their buttons render as plain spans.
      const Btn = mode === "thumb" ? "span" : "button";
      return (
        <div
          className={cn(
            "flex flex-col gap-2 px-6 @2xl:px-14",
            alignCls,
            ctaStyle === "cta.bar" && "px-0",
            ctaStyle === "cta.floating" && "sticky bottom-4 z-10 mx-auto w-fit drop-shadow-2xl",
          )}
          style={pad}
        >
          <Btn
            type={mode === "thumb" ? undefined : "button"}
            onClick={(e) => {
              if (mode === "edit") {
                e.stopPropagation();
                onPickEl?.(b.id, "label");
                return;
              }
              e.stopPropagation();
              onCta(b);
            }}
            data-el={editing ? "label" : undefined}
            className={cn(
              "inline-flex min-h-14 w-full max-w-md items-center justify-center gap-2.5 px-8 text-[17px] font-bold transition-transform",
              ctaStyle === "cta.pill" &&
                "w-fit min-h-12 rounded-full bg-[var(--p-text)] px-6 text-[var(--p-bg)]",
              ctaStyle === "cta.arrow" &&
                "w-fit min-h-10 justify-start rounded-none border-b-2 border-[var(--p-accent)] bg-transparent px-0 text-[var(--p-text)]",
              ctaStyle === "cta.editorial" &&
                "w-fit min-h-16 rounded-none border-y border-[color-mix(in_oklab,var(--p-text)_28%,transparent)] bg-transparent px-2 font-serif text-[clamp(1.5rem,5cqi,3rem)] text-[var(--p-text)]",
              ctaStyle === "cta.bar" && "max-w-none justify-between rounded-none px-8 py-5",
              ctaStyle === "cta.glow" &&
                "shadow-[0_0_26px_color-mix(in_oklab,var(--p-accent)_55%,transparent)] ring-2 ring-[var(--p-accent)] ring-offset-4 ring-offset-[var(--p-bg)]",
              mode !== "edit" && "hover:scale-[1.02] active:scale-[0.98]",
              editing && "outline-offset-4",
              editing &&
                (selectedEl === "label"
                  ? "outline-[3px] outline-solid outline-primary"
                  : "outline-2 outline-dashed outline-transparent hover:outline-primary/70"),
            )}
            style={{
              background:
                ctaStyle === "cta.outline" ||
                ctaStyle === "cta.arrow" ||
                ctaStyle === "cta.editorial"
                  ? "transparent"
                  : ctaStyle === "cta.pill"
                    ? "var(--p-text)"
                    : "var(--p-accent)",
              color:
                ctaStyle === "cta.outline" ||
                ctaStyle === "cta.arrow" ||
                ctaStyle === "cta.editorial"
                  ? "var(--p-text)"
                  : ctaStyle === "cta.pill"
                    ? "var(--p-bg)"
                    : "var(--p-accent-text)",
              border: ctaStyle === "cta.outline" ? "1.5px solid var(--p-accent)" : undefined,
              borderRadius:
                ctaStyle === "cta.pill"
                  ? 999
                  : ctaStyle === "cta.arrow" ||
                      ctaStyle === "cta.editorial" ||
                      ctaStyle === "cta.bar"
                    ? 0
                    : "var(--p-radius)",
              ...elementCss(b, "label"),
            }}
            tabIndex={mode === "thumb" ? -1 : 0}
          >
            {ctaStyle === "cta.pill" ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--p-accent)] text-[var(--p-accent-text)]">
                <ActionIcon className="h-4 w-4" />
              </span>
            ) : (
              <ActionIcon className="h-5 w-5" />
            )}
            <EditableText
              as="span"
              {...T("label")}
              style={undefined}
              selected={false}
              placeholder="Button label"
            />
          </Btn>
          {hint && mode !== "thumb" && (
            <span className="text-xs" style={{ color: "var(--p-muted)" }}>
              {hint}
            </span>
          )}
        </div>
      );
    }
    case "form":
      return (
        <FormBlock
          block={b}
          L={L}
          mode={mode}
          onEdit={onEdit}
          selectedEl={selectedEl}
          onPickEl={onPickEl}
        />
      );
    case "social":
      return (
        <div className={cn("flex flex-col gap-4 px-6 @2xl:px-14", alignCls)} style={pad}>
          {(c.heading || editing) && (
            <EditableText
              {...T("heading", { color: "var(--p-muted)" })}
              placeholder="Heading"
              className="text-sm font-bold tracking-[0.12em] uppercase"
            />
          )}
          <div className="flex flex-wrap gap-3">
            {(c.links ?? []).map((l) => {
              const Icon = SOCIAL_ICONS[l.platform] ?? Globe;
              const href = l.platform === "whatsapp" ? whatsappLink(l.url) : safeUrl(l.url);
              const cls =
                "flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-105";
              const st = {
                ...(L.surface === "filled"
                  ? { background: "var(--p-surface)" }
                  : { border: "1.5px solid color-mix(in oklab, var(--p-text) 22%, transparent)" }),
                color: "var(--p-text)",
              };
              return mode === "edit" || mode === "thumb" || !href ? (
                <span key={l.id} className={cls} style={st} aria-label={l.platform}>
                  <Icon className="h-5 w-5" />
                </span>
              ) : (
                <a
                  key={l.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                  style={st}
                  aria-label={l.platform}
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </div>
        </div>
      );
    case "footer": {
      const footerStyle = L.styles.footer;
      return (
        <footer
          className={cn(
            "flex flex-col gap-1 border-t px-6 @2xl:px-14",
            alignCls,
            footerStyle === "footer.contact" && "rounded-2xl border px-5",
            footerStyle === "footer.closing" && "pt-8",
            footerStyle === "footer.signature" && "pt-8",
          )}
          style={{
            ...pad,
            borderColor: "color-mix(in oklab, var(--p-text) 12%, transparent)",
            ...(footerStyle === "footer.contact" ? surfaceStyle(L, 24) : {}),
          }}
        >
          {footerStyle === "footer.closing" && (
            <span aria-hidden className="text-5xl leading-none text-[var(--p-accent-ink)]">
              “
            </span>
          )}
          <EditableText
            {...T("text")}
            placeholder="Footer text"
            className={cn(
              "text-[15px] font-semibold",
              footerStyle === "footer.signature" &&
                "break-words font-[var(--p-display)] text-[clamp(2.5rem,11cqi,7rem)] leading-[.9] tracking-[-.06em]",
              footerStyle === "footer.closing" &&
                "max-w-[22ch] font-[var(--p-display)] text-[clamp(1.75rem,7cqi,4rem)] leading-tight",
            )}
          />
          <EditableText
            {...T("small", { color: "var(--p-muted)" })}
            placeholder="Small print"
            className="text-xs"
          />
          {footerStyle === "footer.social" && styleFacts.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {styleFacts.links.map((link) => {
                const href =
                  link.platform === "whatsapp" ? whatsappLink(link.url) : safeUrl(link.url);
                const Icon = SOCIAL_ICONS[link.platform] ?? Globe;
                return href ? (
                  <a
                    key={link.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.platform}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--p-text)_22%,transparent)]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ) : null;
              })}
            </div>
          )}
          {footerStyle === "footer.qr" && (
            <div className="mt-3 flex items-center gap-4">
              <QRCodeSVG
                value={styleFacts.url}
                size={84}
                level="M"
                bgColor="#ffffff"
                fgColor="#141414"
              />
              <span className="text-xs text-[var(--p-muted)]">Scan to open this poster</span>
            </div>
          )}
          {footerStyle === "footer.contact" && styleFacts.contacts.length > 0 && (
            <ul className="mt-3 flex w-full flex-col gap-2">
              {styleFacts.contacts.map((contact) => (
                <li key={contact.id} className="flex min-w-0 items-center gap-3 text-sm">
                  <span className="shrink-0 text-xs font-bold uppercase text-[var(--p-muted)]">
                    {contact.kind}
                  </span>
                  <span className="min-w-0 break-words font-medium">{contact.value}</span>
                </li>
              ))}
            </ul>
          )}
        </footer>
      );
    }
  }
}

function theme_radius() {
  return 20;
}

function FormBlock({
  block: b,
  L,
  mode,
  onEdit,
  selectedEl,
  onPickEl,
}: {
  block: Block;
  L: RenderLayout;
  mode: PosterMode;
  onEdit?: PosterProps["onEdit"];
  selectedEl?: ElementKey | null;
  onPickEl?: PosterProps["onSelectElement"];
}) {
  const editing = mode === "edit";
  const c = b.content;
  const responderUrl = safeGoogleFormUrl(c.googleFormUrl);
  const T = (k: ElementKey, style?: CSSProperties) =>
    textProps(b, k, editing, onEdit, selectedEl, onPickEl, style);
  const buttonClass =
    "mt-2 inline-flex min-h-13 w-full items-center justify-center gap-2 px-6 py-3.5 text-[16px] font-bold";
  const buttonStyle = {
    background: "var(--p-accent)",
    color: "var(--p-accent-text)",
    borderRadius: "var(--p-radius)",
    ...elementCss(b, "submitLabel"),
  } as CSSProperties;

  return (
    <div
      className="mx-auto px-6 @2xl:px-14"
      style={{
        paddingTop: padY(b.style.padding),
        paddingBottom: padY(b.style.padding),
        maxWidth: "calc(36rem * var(--p-wf, 1))",
      }}
    >
      {(c.heading || editing) && (
        <EditableText
          as="h2"
          {...T("heading", headingStyle(b, "clamp(24px, 7cqi, 40px)", L))}
          placeholder="Registration heading"
          className="mb-1 w-full"
        />
      )}
      {(c.body || editing) && (
        <EditableText
          {...T("body", { color: "var(--p-muted)", textAlign: b.style.align })}
          placeholder="Short description"
          className="mb-5 w-full text-[15px]"
        />
      )}
      {responderUrl && mode !== "edit" && mode !== "thumb" ? (
        <a
          href={responderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          style={buttonStyle}
        >
          {c.submitLabel || "Open Google Form"}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : editing ? (
        <button
          type="button"
          data-el="submitLabel"
          onClick={(event) => {
            event.stopPropagation();
            onPickEl?.(b.id, "submitLabel");
          }}
          className={buttonClass}
          style={buttonStyle}
        >
          {c.submitLabel || "Open Google Form"}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : mode === "thumb" ? (
        <span className={buttonClass} style={buttonStyle}>
          {c.submitLabel || "Open Google Form"}
        </span>
      ) : (
        <p
          role="status"
          className="mt-3 rounded-xl border border-glass-border bg-glass p-3 text-sm"
          style={{ color: "var(--p-muted)" }}
        >
          Add a Google Forms responder link in the editor before publishing this campaign.
        </p>
      )}
      {responderUrl && mode !== "edit" && mode !== "thumb" && (
        <p className="mt-3 text-center text-xs" style={{ color: "var(--p-muted)" }}>
          Responses are collected by Google Forms.
        </p>
      )}
    </div>
  );
}
