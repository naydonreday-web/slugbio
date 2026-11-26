import { contrastRatio, mix, parseColor } from "../themes";
import type { Purpose } from "../types";
import { BLOCK_REGISTRY_VERSION, BLOCK_TYPES } from "./registry";
import { chooseTemplateStyles, pickProfiles, type ContentSignals } from "./curate";
import type { ProfileId } from "./styles";
import { validateTemplate, type TemplateConfig, type TemplateValidation } from "./schema";
import { finishJob, recordValidation, saveDraftForReview, startJob } from "./store";

/**
 * Wiby's template designer. It only ever outputs template *data* that then goes through the
 * same validation as any other template — no generated code is executed. It reads the creative
 * profiles and the block style registry, picks a direction (plus one it blends with), derives
 * colours and type from it, then art-directs one style per block from the campaign's content.
 * A hosted model can replace `designTemplate` later without changing the contract or storage.
 */
export interface WibyTemplateInput {
  prompt?: string;
  title?: string;
  purpose?: Purpose;
  tone?: string;
  /** What the campaign actually contains, so styles fit the content (no photo, an end date, …). */
  signals?: Partial<ContentSignals>;
  /** Design in this direction instead of letting Wiby choose (used by the style gallery). */
  profile?: ProfileId;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}
function hueOf(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 30;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const PURPOSE_HUE: Record<Purpose, number> = { event: 320, product: 15, service: 200, announcement: 190, offer: 12, food: 30, other: 160 };
const HUE_NAMES: [number, string][] = [[15, "Coral"], [40, "Amber"], [70, "Citron"], [110, "Fern"], [160, "Jade"], [195, "Lagoon"], [230, "Cobalt"], [265, "Indigo"], [300, "Orchid"], [335, "Rose"], [360, "Coral"]];
const hueName = (h: number) => HUE_NAMES.find(([max]) => h <= max)?.[1] ?? "Coral";

/** Pick the readable one of two colours against a background. */
const onColor = (bg: string) => (contrastRatio("#ffffff", bg) >= contrastRatio("#111111", bg) ? "#ffffff" : "#111111");

/** Nudge a colour lighter/darker until it reaches `min` contrast against `bg`. */
function ensureContrast(color: string, bg: string, min: number): string {
  let c = color;
  const target = contrastRatio("#ffffff", bg) > contrastRatio("#000000", bg) ? "#ffffff" : "#000000";
  for (let i = 0; i < 12 && contrastRatio(c, bg) < min; i++) c = mix(c, target, 0.18);
  return c;
}

const CENTRED: ProfileId[] = ["luxury", "futuristic", "playful", "commercial"];

/** Design one template. Same input + attempt always gives the same design; a new attempt gives a new one. */
export function designTemplate(input: WibyTemplateInput, attempt = 0): TemplateConfig {
  const text = `${input.prompt ?? ""} ${input.title ?? ""}`;
  const r = rng(hash(`${text}|${input.purpose ?? ""}|${input.tone ?? ""}|${input.profile ?? ""}|${attempt}`));
  const { primary: P, secondary: S } = pickProfiles(input, attempt, r, input.profile);
  const tk = P.tokens;

  // Colour: the brief's colour if it names one, else the direction's hue, else the purpose's.
  const asked = parseColor(text);
  const preferred = tk.hue ?? PURPOSE_HUE[input.purpose ?? "other"];
  const baseHue = asked ? hueOf(asked.hex) : (preferred + (attempt ? r() * 120 - 60 : (r() - 0.5) * 30) + 360) % 360;
  const dark = r() < tk.dark;
  const [satLo, satHi] = tk.saturation;
  const bg = dark ? hsl(baseHue, 20 + r() * 25, 7 + r() * 6) : hsl(baseHue, 25 + r() * 30, 94 + r() * 3);
  const surface = mix(bg, dark ? "#ffffff" : "#000000", dark ? 0.09 : 0.06);
  const textC = ensureContrast(dark ? hsl(baseHue, 25, 95) : hsl(baseHue, 40, 10), surface, 7.5);
  const muted = ensureContrast(mix(bg, textC, 0.62), bg, 4.6);
  const accentHue = P.id === "luxury" ? baseHue : (baseHue + [0, 30, 150, 180, 200][Math.floor(r() * 5)]) % 360;
  const sat = satLo + r() * (satHi - satLo);
  const accent = dark ? hsl(accentHue, sat, 58 + r() * 10) : hsl(accentHue, sat, 40 + r() * 8);
  const accentText = onColor(accent);
  const safeAccent = contrastRatio(accentText, accent) >= 4.5 ? accent : ensureContrast(accent, accentText, 4.5);

  // Type and shape come from the direction, with an occasional borrow from the blend.
  const display = tk.display[Math.floor(r() * tk.display.length)];
  const body = tk.body;
  const radius = (r() < 0.25 ? S.tokens.radius : tk.radius)[Math.floor(r() * 2) % (r() < 0.25 ? S.tokens.radius.length : tk.radius.length)] ?? tk.radius[0];
  const surfaceStyle = tk.surface[Math.floor(r() * tk.surface.length)];
  const headingCase = tk.headingCase === "either" ? (r() < 0.5 ? "uppercase" : "none") : tk.headingCase;
  const align = CENTRED.includes(P.id) ? "center" : "left";
  const loud = tk.headingWeight >= 800;

  const plan = chooseTemplateStyles({ primary: P, secondary: S, signals: input.signals, purpose: input.purpose, tone: input.tone, dark }, r);
  const name = `${hueName(baseHue)} ${P.names[Math.floor(r() * P.names.length)]}`;
  const id = `wiby-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(hash(`${text}${attempt}${Date.now()}`) % 46656).toString(36)}`.slice(0, 48);

  return {
    schemaVersion: 1,
    id,
    version: "1.0.0",
    name,
    description: `${P.name} direction with a touch of ${S.name.toLowerCase()} — ${P.characteristics.slice(0, 3).join(", ")}. Designed by Wiby.`.slice(0, 240),
    category: input.purpose ?? "general",
    tags: [P.id, S.id, dark ? "dark" : "light", display === "fraunces" ? "serif" : display === "bricolage" ? "display" : "sans"],
    source: "wiby",
    tokens: { colors: { bg, surface, text: textC, muted, accent: safeAccent, accentText }, radius },
    typography: { display, body, headingWeight: tk.headingWeight, headingCase, tracking: tk.tracking, eyebrow: tk.eyebrow },
    layout: { width: tk.width, surface: surfaceStyle, dividers: tk.dividers, blockOrder: [...BLOCK_TYPES] },
    blocks: {
      hero: { variant: plan.styles.hero, align, padding: P.id === "minimal" || P.id === "luxury" ? 56 : 48, headingScale: loud ? 1.2 : 1.1 },
      text: { align: "left", padding: 36, headingScale: 0.9 },
      image: { variant: plan.styles.image, padding: 20 },
      offer: { variant: plan.styles.offer, align, padding: 44 },
      details: { variant: plan.styles.details, align: "left", padding: 36, headingScale: 0.85 },
      cta: { variant: plan.styles.cta, align, padding: 32 },
      form: { align: "left", padding: 40, headingScale: 0.9 },
      social: { align, padding: 30 },
      footer: { variant: plan.styles.footer, align, padding: 28 },
    },
    responsive: { mobile: { paddingScale: tk.width === "wide" ? 1 : 0.92 }, desktop: { paddingScale: tk.width === "narrow" ? 1.3 : 1.1, detailsColumns: tk.detailsColumns } },
    supportedBlocks: [...BLOCK_TYPES],
    design: { profile: P.id, blend: [S.id], notes: [`Direction: ${P.name}, blended with ${S.name.toLowerCase()}.`, ...plan.notes].slice(0, 10) },
    compatibility: { blockRegistry: BLOCK_REGISTRY_VERSION, unsupported: "hide" },
  };
}

export interface WibyResult {
  template?: TemplateConfig;
  validation: TemplateValidation;
  jobId: string;
}

/** Full job: design → validate → save as draft awaiting review. Every step is recorded. */
export function runWibyTemplateJob(input: WibyTemplateInput, attempt = 0): WibyResult {
  const job = startJob({ ...input, attempt });
  try {
    const draft = designTemplate(input, attempt);
    const validation = validateTemplate(draft);
    recordValidation({ templateId: draft.id, version: draft.version, jobId: job.id, ok: validation.ok, checks: validation.checks });
    if (!validation.template) {
      finishJob(job.id, { status: "failed", error: validation.checks.filter((c) => !c.ok).map((c) => c.label).join(", ") });
      return { validation, jobId: job.id };
    }
    saveDraftForReview(validation.template);
    finishJob(job.id, { status: "done", templateId: validation.template.id });
    return { template: validation.template, validation, jobId: job.id };
  } catch (e) {
    finishJob(job.id, { status: "failed", error: e instanceof Error ? e.message : "Unknown error" });
    throw e;
  }
}
