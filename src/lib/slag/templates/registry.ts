import { z } from "zod";
import { BLOCK_META } from "../blocks";
import type { Block, BlockStyle, BlockType } from "../types";
import { styleRegistrySnapshot, variantNames } from "./styles";

/**
 * The authoritative list of SlagBio campaign blocks. Templates may only style these types —
 * a template (or Wiby) can never introduce a new block type.
 */
export const BLOCK_TYPES = ["hero", "text", "image", "offer", "details", "cta", "form", "social", "footer"] as const satisfies readonly BlockType[];

export const blockTypeSchema = z.enum(BLOCK_TYPES);

export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  /** Validates the content a campaign stores for this block. */
  content: z.ZodTypeAny;
  /** Block style properties a template may set. Anything else stays with the user. */
  styleProps: (keyof BlockStyle)[];
  /** Visual styles the universal renderer knows how to draw (legacy names first, then style-registry ids); the first is the default. */
  variants: readonly [string, ...string[]];
  rendering: { position: "first" | "last" | "any"; maxPerPoster?: number };
  responsive: string;
  /** Guidance the assistant follows when editing or generating this block. */
  ai: string;
}

const text = (max: number) => z.string().max(max);
const imageRef = z.string().max(2_500_000);
const PRESENTATION: (keyof BlockStyle)[] = ["align", "padding", "headingScale", "headingWeight", "uppercase", "variant"];

export const BLOCK_REGISTRY: Record<BlockType, BlockDefinition> = {
  hero: {
    type: "hero", ...BLOCK_META.hero,
    content: z.object({ eyebrow: text(80).optional(), headline: text(200).optional(), subtitle: text(500).optional(), image: imageRef.optional(), imageHeight: z.number().min(120).max(900).optional(), overlay: z.number().min(0).max(0.95).optional() }),
    styleProps: PRESENTATION,
    variants: variantNames("hero"),
    rendering: { position: "first", maxPerPoster: 1 },
    responsive: "Full-bleed photo on every screen; headline scales with poster width (11% up to 84px).",
    ai: "Keep the headline under 8 words. The subtitle is one sentence. Only change the photo when asked.",
  },
  text: {
    type: "text", ...BLOCK_META.text,
    content: z.object({ heading: text(200).optional(), body: text(4000).optional() }),
    styleProps: PRESENTATION,
    variants: ["default"],
    rendering: { position: "any" },
    responsive: "Single readable column, max ~65 characters per line on wide screens.",
    ai: "Two or three friendly sentences. Never invent facts such as prices, dates or addresses.",
  },
  image: {
    type: "image", ...BLOCK_META.image,
    content: z.object({ image: imageRef.optional(), caption: text(300).optional(), imageHeight: z.number().min(120).max(900).optional(), rounded: z.boolean().optional() }),
    styleProps: ["align", "padding", "variant"],
    variants: variantNames("image"),
    rendering: { position: "any" },
    responsive: "Full content width; height is fixed in pixels so the crop stays predictable.",
    ai: "Captions are short. Do not remove a photo the user uploaded.",
  },
  offer: {
    type: "offer", ...BLOCK_META.offer,
    content: z.object({ heading: text(120).optional(), price: text(60).optional(), originalPrice: text(60).optional(), note: text(300).optional(), endsAt: text(40).optional() }),
    styleProps: PRESENTATION,
    variants: variantNames("offer"),
    rendering: { position: "any" },
    responsive: "Centred panel capped at ~36rem wide.",
    ai: "Never change a price unless the user gives the new one.",
  },
  details: {
    type: "details", ...BLOCK_META.details,
    content: z.object({ heading: text(200).optional(), items: z.array(z.object({ id: z.string().min(1), icon: z.enum(["date", "time", "location", "phone", "price", "info"]), label: text(80), value: text(300) })).max(20).optional() }),
    styleProps: PRESENTATION,
    variants: variantNames("details"),
    rendering: { position: "any" },
    responsive: "One column on phones; the template sets 1–3 columns on wide screens.",
    ai: "Each item is a fact the user gave. Keep labels to one or two words.",
  },
  cta: {
    type: "cta", ...BLOCK_META.cta,
    content: z.object({ label: text(80).optional(), action: z.enum(["whatsapp", "url", "form", "phone", "email"]).optional(), target: text(500).optional(), message: text(500).optional(), note: text(200).optional() }),
    styleProps: ["align", "padding", "variant"],
    variants: variantNames("cta"),
    rendering: { position: "any" },
    responsive: "Full-width button on phones, capped at ~28rem on wide screens. Minimum 56px tall.",
    ai: "Button labels start with a verb. Never change where the button goes unless asked.",
  },
  form: {
    type: "form", ...BLOCK_META.form,
    content: z.object({ heading: text(200).optional(), body: text(600).optional(), fields: z.array(z.object({ id: z.string().min(1), label: text(120), type: z.enum(["text", "email", "tel", "textarea", "select"]), required: z.boolean(), options: z.array(text(120)).max(30).optional() })).max(20).optional(), submitLabel: text(60).optional(), successMessage: text(300).optional() }),
    styleProps: PRESENTATION,
    variants: ["default"],
    rendering: { position: "any", maxPerPoster: 1 },
    responsive: "Single column, inputs at least 16px so phones don't zoom.",
    ai: "Ask for as little as possible. Never remove a field that already has responses.",
  },
  social: {
    type: "social", ...BLOCK_META.social,
    content: z.object({ heading: text(120).optional(), links: z.array(z.object({ id: z.string().min(1), platform: z.enum(["instagram", "facebook", "tiktok", "x", "whatsapp", "website"]), url: text(500) })).max(12).optional() }),
    styleProps: ["align", "padding", "headingScale"],
    variants: ["default"],
    rendering: { position: "any" },
    responsive: "Icons wrap onto new rows; 48px touch targets.",
    ai: "Only add links the user gives you.",
  },
  footer: {
    type: "footer", ...BLOCK_META.footer,
    content: z.object({ text: text(200).optional(), small: text(500).optional() }),
    styleProps: ["align", "padding", "headingScale", "variant"],
    variants: variantNames("footer"),
    rendering: { position: "last", maxPerPoster: 1 },
    responsive: "Stays at the bottom with a hairline above it.",
    ai: "Keep it to the campaign name and short terms.",
  },
};

/** Bumped whenever a block definition changes in a way templates must know about. */
export const BLOCK_REGISTRY_VERSION = "1.1.0";

export function isRegisteredBlockType(t: string): t is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(t);
}

export function blockVariants(type: BlockType): readonly string[] {
  return BLOCK_REGISTRY[type].variants;
}

/** Checks a stored block against the registry: known type and valid content. */
export function validateBlock(block: Block): { ok: true } | { ok: false; error: string } {
  if (!isRegisteredBlockType(block.type)) return { ok: false, error: `Unknown block type "${String(block.type)}"` };
  if (!block.id) return { ok: false, error: "Block has no id" };
  const r = BLOCK_REGISTRY[block.type].content.safeParse(block.content);
  return r.success ? { ok: true } : { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

/** Plain-data snapshot of the registry, as stored in the block_registry collection. */
export function blockRegistrySnapshot() {
  return {
    version: BLOCK_REGISTRY_VERSION,
    blocks: BLOCK_TYPES.map((t) => {
      const d = BLOCK_REGISTRY[t];
      return { type: d.type, label: d.label, styleProps: d.styleProps, variants: [...d.variants], rendering: d.rendering, responsive: d.responsive, ai: d.ai };
    }),
    /** The visual style registry, so Wiby and admins can discover every style a block can take. */
    styles: styleRegistrySnapshot(),
  };
}
