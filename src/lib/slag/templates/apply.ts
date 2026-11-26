import { isDark } from "../themes";
import type { Block, BlockType, Campaign, Theme } from "../types";
import { curateCampaignStyles } from "./curate";
import type { TemplateConfig } from "./schema";
import { BLOCK_TYPES } from "./registry";
import { canonicalStyleId, defaultStyleId } from "./styles";

/** Theme values a template contributes. They live on the campaign so the editor and AI can still tweak colours and fonts. */
export function themeFromTemplate(t: TemplateConfig, name = t.name): Theme {
  const c = t.tokens.colors;
  return { id: `tpl-${t.id}`, name, ...c, font: t.typography.body, displayFont: t.typography.display, radius: t.tokens.radius };
}

export interface Compatibility {
  /** Block ids the template draws. */
  shown: string[];
  /** Blocks the template can't draw. They stay in the campaign and reappear with a template that supports them. */
  hidden: { id: string; type: BlockType }[];
}

export function checkCompatibility(blocks: Block[], t: TemplateConfig): Compatibility {
  const shown: string[] = [];
  const hidden: Compatibility["hidden"] = [];
  for (const b of blocks) {
    if (t.supportedBlocks.includes(b.type)) shown.push(b.id);
    else hidden.push({ id: b.id, type: b.type });
  }
  return { shown, hidden };
}

/**
 * Switch a campaign to another template. Only presentation changes: block ids, text, photos,
 * form fields, button destinations and per-element formatting are kept exactly as they were.
 * `reorder` applies the template's preferred block order — used for brand-new campaigns only.
 * Per-block style choices belong to the old template and are cleared; a Wiby template then
 * re-curates styles for blocks whose content or neighbours don't suit its defaults.
 */
export function applyTemplate(c: Campaign, t: TemplateConfig, opts: { reorder?: boolean } = {}): Campaign {
  const blocks = c.blocks.map((b): Block => {
    const preset = t.blocks[b.type] ?? {};
    const style = { ...b.style };
    // Block colour overrides belong to the old palette; the new template's palette replaces them.
    delete style.bg;
    delete style.text;
    delete style.accent;
    delete style.variant;
    if (preset.align) style.align = preset.align;
    if (preset.padding !== undefined) style.padding = preset.padding;
    if (preset.headingScale !== undefined) style.headingScale = preset.headingScale;
    style.headingWeight = b.type === "hero" ? Math.min(900, t.typography.headingWeight + 100) : t.typography.headingWeight;
    style.uppercase = t.typography.headingCase === "uppercase" ? true : undefined;
    return { ...b, content: b.content, style };
  });
  if (opts.reorder) {
    const rank = (type: BlockType) => {
      const i = t.layout.blockOrder.indexOf(type);
      return i < 0 ? t.layout.blockOrder.length : i;
    };
    blocks.sort((x, y) => rank(x.type) - rank(y.type));
  }
  const curated = curateCampaignStyles(blocks, t, { purpose: c.purpose, tone: c.brief?.tone }, c.slug, isDark(t.tokens.colors.bg));
  return { ...c, theme: themeFromTemplate(t), template: { id: t.id, version: t.version }, blocks: curated.blocks };
}

/** Everything the universal renderer needs from a template, as plain values and CSS variables. */
export interface RenderLayout {
  /** The template's style id for each block type (legacy variant names already resolved). */
  styles: Partial<Record<BlockType, string>>;
  surface: TemplateConfig["layout"]["surface"];
  dividers: boolean;
  eyebrow: TemplateConfig["typography"]["eyebrow"];
  tracking: TemplateConfig["typography"]["tracking"];
  uppercase: boolean;
  supported: Set<BlockType>;
  vars: Record<string, string>;
}

const WIDTH = { narrow: "0.82", regular: "1", wide: "1.2" } as const;

export function renderLayout(t: TemplateConfig): RenderLayout {
  return {
    styles: Object.fromEntries(BLOCK_TYPES.map((b) => [b, canonicalStyleId(b, t.blocks[b]?.variant) ?? defaultStyleId(b)]).filter(([, v]) => v)),
    surface: t.layout.surface,
    dividers: t.layout.dividers,
    eyebrow: t.typography.eyebrow,
    tracking: t.typography.tracking,
    uppercase: t.typography.headingCase === "uppercase",
    supported: new Set(t.supportedBlocks),
    vars: {
      "--p-wf": WIDTH[t.layout.width],
      "--p-pad-m": String(t.responsive.mobile.paddingScale),
      "--p-pad-d": String(t.responsive.desktop.paddingScale),
      "--p-dcols": `repeat(${t.responsive.desktop.detailsColumns}, minmax(0, 1fr))`,
    },
  };
}
