import { z } from "zod";
import { contrastRatio } from "../themes";
import { BLOCK_TYPES, blockTypeSchema, blockVariants } from "./registry";
import { PROFILE_IDS } from "./styles";
import type { BlockType } from "../types";

/** Version of the template contract itself. Configs with another schemaVersion are rejected. */
export const TEMPLATE_SCHEMA_VERSION = 1 as const;

/**
 * Templates are data, never code: no free CSS, no scripts, no URLs except a preview image.
 * Every visual value is a token from a closed set or a range-checked number, so the
 * renderer only ever writes values it understands.
 */
const UNSAFE = /[<>{};\\]|javascript:|data:text|url\(|expression\(|@import/i;
const safeText = (max: number) => z.string().trim().min(1).max(max).refine((s) => !UNSAFE.test(s), "Contains characters that aren't allowed");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colours must be 6-digit hex values like #ff5e3a");
const font = z.enum(["jakarta", "fraunces", "bricolage"]);

const blockPreset = z.object({
  variant: z.string().max(32).optional(),
  align: z.enum(["left", "center"]).optional(),
  padding: z.number().min(0).max(120).optional(),
  headingScale: z.number().min(0.7).max(1.8).optional(),
}).strict();
export type BlockPreset = z.infer<typeof blockPreset>;

const blockPresets = z.object(Object.fromEntries(BLOCK_TYPES.map((t) => [t, blockPreset.optional()])) as Record<BlockType, z.ZodOptional<typeof blockPreset>>).strict();

export const templateSchema = z.object({
  schemaVersion: z.literal(TEMPLATE_SCHEMA_VERSION),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,47}$/, "Use lowercase letters, numbers and dashes"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must look like 1.0.0"),
  name: safeText(48),
  description: safeText(240),
  category: z.enum(["event", "product", "service", "announcement", "offer", "food", "other", "general"]),
  tags: z.array(safeText(24)).max(8),
  source: z.enum(["builtin", "wiby", "admin"]),
  tokens: z.object({
    colors: z.object({ bg: hex, surface: hex, text: hex, muted: hex, accent: hex, accentText: hex }).strict(),
    radius: z.number().int().min(0).max(999),
  }).strict(),
  typography: z.object({
    display: font,
    body: font,
    headingWeight: z.number().int().min(400).max(900),
    headingCase: z.enum(["none", "uppercase"]),
    tracking: z.enum(["tight", "normal", "wide"]),
    eyebrow: z.enum(["pill", "text"]),
  }).strict(),
  layout: z.object({
    width: z.enum(["narrow", "regular", "wide"]),
    surface: z.enum(["filled", "outline", "plain"]),
    dividers: z.boolean(),
    /** Preferred order for new campaigns. Existing campaigns keep the user's order. */
    blockOrder: z.array(blockTypeSchema).min(1).max(BLOCK_TYPES.length),
  }).strict(),
  blocks: blockPresets,
  responsive: z.object({
    mobile: z.object({ paddingScale: z.number().min(0.5).max(1.5) }).strict(),
    desktop: z.object({ paddingScale: z.number().min(0.5).max(1.8), detailsColumns: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).strict(),
  }).strict(),
  previewImage: z.string().regex(/^(lib:[a-z-]+|https:\/\/[^\s"'()<>]+)$/, "Preview must be a library image or an https link").optional(),
  supportedBlocks: z.array(blockTypeSchema).min(1),
  /** Wiby's art direction: the creative profile it designed in, what it blended, and why it chose each style. */
  design: z.object({
    profile: z.enum(PROFILE_IDS),
    blend: z.array(z.enum(PROFILE_IDS)).max(2),
    notes: z.array(safeText(200)).max(10),
  }).strict().optional(),
  compatibility: z.object({
    blockRegistry: z.string().regex(/^\d+\.\d+\.\d+$/),
    /** What to do with a campaign block this template doesn't support. */
    unsupported: z.literal("hide"),
  }).strict(),
}).strict().superRefine((t, ctx) => {
  for (const type of BLOCK_TYPES) {
    const v = t.blocks[type]?.variant;
    if (v && !blockVariants(type).includes(v)) ctx.addIssue({ code: "custom", path: ["blocks", type, "variant"], message: `"${v}" isn't a registered ${type} style. Use one of: ${blockVariants(type).join(", ")}` });
  }
  for (const type of t.layout.blockOrder) {
    if (!t.supportedBlocks.includes(type)) ctx.addIssue({ code: "custom", path: ["layout", "blockOrder"], message: `${type} is ordered but not supported` });
  }
  if (new Set(t.layout.blockOrder).size !== t.layout.blockOrder.length) ctx.addIssue({ code: "custom", path: ["layout", "blockOrder"], message: "Each block type appears once" });
});

export type TemplateConfig = z.infer<typeof templateSchema>;

export interface ValidationCheck {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}
export interface TemplateValidation {
  ok: boolean;
  checks: ValidationCheck[];
  template?: TemplateConfig;
}

/** Schema + readability checks. Only a passing template may be saved or rendered. */
export function validateTemplate(input: unknown): TemplateValidation {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, checks: [{ id: "schema", label: "Template format", ok: false, detail: parsed.error.issues.map((i) => `${i.path.join(".") || "template"}: ${i.message}`).join("; ") }] };
  }
  const t = parsed.data;
  const c = t.tokens.colors;
  const ratio = (a: string, b: string) => Math.round(contrastRatio(a, b) * 10) / 10;
  const checks: ValidationCheck[] = [
    { id: "schema", label: "Template format", ok: true },
    { id: "text-contrast", label: "Main text is easy to read", ok: contrastRatio(c.text, c.bg) >= 7 && contrastRatio(c.text, c.surface) >= 4.5, detail: `${ratio(c.text, c.bg)}:1` },
    { id: "muted-contrast", label: "Secondary text is readable", ok: contrastRatio(c.muted, c.bg) >= 4.5, detail: `${ratio(c.muted, c.bg)}:1` },
    // Button labels are large and bold, so they use the 3:1 large-text level.
    { id: "button-contrast", label: "Button text is readable", ok: contrastRatio(c.accentText, c.accent) >= 3, detail: `${ratio(c.accentText, c.accent)}:1` },
    { id: "core-blocks", label: "Supports hero, button and footer", ok: (["hero", "cta", "footer"] as const).every((b) => t.supportedBlocks.includes(b)) },
  ];
  const ok = checks.every((x) => x.ok);
  return { ok, checks, template: ok ? t : undefined };
}
