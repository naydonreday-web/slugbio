import type { Block, BlockType, Purpose } from "../types";
import { CREATIVE_PROFILES, getProfile, type CreativeProfile } from "./profiles";
import {
  STYLED_BLOCKS, canonicalStyleId, defaultStyleId, getStyle, isStyledBlock, missingRequirements, parseEndsAt, styleContext, stylesFor,
  type BlockVisualStyle, type ProfileId, type Requirement, type StyleContext, type StyledBlockType,
} from "./styles";

/**
 * Wiby's art direction. Picks block styles from the registry by reading each style's description,
 * characteristics and AI notes against the campaign: what content exists, the chosen creative
 * direction, what sits next to what, and which block should be loudest. Deterministic for the same
 * input, so "Try another" is the only thing that changes a design.
 */

export interface ContentSignals {
  hasImage: boolean;
  headlineWords: number;
  hasOriginalPrice: boolean;
  hasEndDate: boolean;
  hasDate: boolean;
  hasLocation: boolean;
  detailCount: number;
  hasSocial: boolean;
  hasContact: boolean;
  hasCaption: boolean;
  captionWords: number;
  footerWords: number;
  ctaLabelWords: number;
  blockCount: number;
}

export const DEFAULT_SIGNALS: ContentSignals = {
  hasImage: true, headlineWords: 5, hasOriginalPrice: false, hasEndDate: false, hasDate: false, hasLocation: false, detailCount: 3,
  hasSocial: false, hasContact: false, hasCaption: false, captionWords: 0, footerWords: 3, ctaLabelWords: 3, blockCount: 6,
};

const words = (s?: string) => (s ?? "").trim().split(/\s+/).filter(Boolean).length;

export function signalsFromBlocks(blocks: Block[]): ContentSignals {
  const find = (t: BlockType) => blocks.find((b) => b.type === t);
  const hero = find("hero"), offer = find("offer"), details = find("details"), image = find("image"), footer = find("footer"), cta = find("cta");
  const items = details?.content.items ?? [];
  const ctx = styleContext(blocks);
  return {
    hasImage: !!hero?.content.image,
    headlineWords: words(hero?.content.headline),
    hasOriginalPrice: !!offer?.content.originalPrice?.trim(),
    hasEndDate: !!parseEndsAt(offer?.content.endsAt),
    hasDate: items.some((i) => i.icon === "date" && i.value.trim()),
    hasLocation: items.some((i) => i.icon === "location" && i.value.trim()),
    detailCount: items.length,
    hasSocial: ctx.links.length > 0,
    hasContact: ctx.contacts.length > 0,
    hasCaption: !!image?.content.caption?.trim(),
    captionWords: words(image?.content.caption),
    footerWords: words(footer?.content.text),
    ctaLabelWords: words(cta?.content.label),
    blockCount: blocks.length,
  };
}

export interface DesignBrief {
  prompt?: string;
  title?: string;
  purpose?: Purpose;
  tone?: string;
}

/** Profiles ranked for a brief. `jitter` (0–1 values) only breaks near-ties so retries explore. */
export function rankProfiles(brief: DesignBrief, jitter: () => number = () => 0): { profile: CreativeProfile; score: number }[] {
  const text = `${brief.prompt ?? ""} ${brief.title ?? ""}`.toLowerCase();
  const tone = (brief.tone ?? "").toLowerCase();
  return CREATIVE_PROFILES.map((p) => {
    let score = 0;
    if (tone && p.tones[0] === tone) score += 3;
    else if (tone && p.tones.includes(tone)) score += 2;
    if (brief.purpose && p.purposes.includes(brief.purpose)) score += 1.5;
    const hits = text.match(new RegExp(`\\b(${p.keywords})`, "gi"));
    score += Math.min(3, (hits?.length ?? 0) * 1.5);
    return { profile: p, score: score + jitter() * 2.2 };
  }).sort((a, b) => b.score - a.score);
}

/** The primary direction plus one it blends with. Retries walk further down the ranking. */
export function pickProfiles(brief: DesignBrief, attempt: number, rand: () => number, forced?: ProfileId): { primary: CreativeProfile; secondary: CreativeProfile } {
  const ranked = rankProfiles(brief, attempt ? rand : () => 0);
  const primary = forced ? getProfile(forced) : ranked[attempt > 0 ? Math.floor(rand() * Math.min(3, ranked.length)) : 0].profile;
  const rest = ranked.filter((r) => r.profile.id !== primary.id);
  const paired = rest.find((r) => primary.pairsWith.includes(r.profile.id) && r.score >= rest[0].score - 1.5) ?? rest.find((r) => primary.pairsWith.includes(r.profile.id)) ?? rest[0];
  return { primary, secondary: paired.profile };
}

const LABEL: Record<StyledBlockType, string> = { hero: "Hero", image: "Photo", offer: "Offer", details: "Details", cta: "Button", footer: "Footer" };

interface ScoreInput {
  primary: CreativeProfile;
  secondary: CreativeProfile;
  signals: ContentSignals;
  purpose?: Purpose;
  tone?: string;
  dark: boolean;
  /** Families already on the poster, and the one right above this block. */
  used: Set<string>;
  previousFamily?: string;
  heroEnergy: number;
  missing: Requirement[];
}

function scoreStyle(st: BlockVisualStyle, x: ScoreInput, rand: () => number): { score: number; reason: string } {
  if (x.missing.length) return { score: -100, reason: "" };
  const sig = x.signals;
  const tone = (x.tone ?? "").toLowerCase();
  let score = 0;
  const reasons: [number, string][] = [];
  const bump = (n: number, why?: string) => { score += n; if (why && n > 0) reasons.push([n, why]); };

  const pi = x.primary.styles[st.blockType].indexOf(st.id);
  const si = x.secondary.styles[st.blockType].indexOf(st.id);
  if (pi >= 0) bump(3 - pi * 0.5, `fits the ${x.primary.name.toLowerCase()} direction`);
  else if (st.profiles.includes(x.primary.id)) bump(0.8, `fits the ${x.primary.name.toLowerCase()} direction`);
  if (si >= 0) bump(1.6 - si * 0.3, `borrowed from the ${x.secondary.name.toLowerCase()} direction`);

  switch (st.id) {
    case "hero.typographic": bump(sig.headlineWords <= 4 ? 1.5 : sig.headlineWords >= 9 ? -2 : 0, "your short headline gets the whole stage"); if (!sig.hasImage) bump(1.2, "there's no photo, so type leads"); break;
    case "hero.neon": bump(sig.headlineWords >= 9 ? -1 : sig.headlineWords <= 4 ? 0.6 : 0, "a short line glows best"); break;
    case "hero.cinematic": if (!sig.hasImage) bump(-2.5); else bump(0.4, "your photo carries the poster"); if (sig.headlineWords >= 9) bump(-0.5); break;
    case "hero.editorial": if (!sig.hasImage) bump(-2.5); if (sig.headlineWords >= 9) bump(1, "a longer headline reads best under the photo"); break;
    case "hero.split": if (sig.headlineWords >= 7) bump(1, "photo and words get equal room"); break;
    case "hero.gradient": case "hero.colour-block": case "hero.minimal": if (!sig.hasImage) bump(0.8, "works without a photo"); break;
    case "image.text-overlay": bump(!sig.hasCaption ? -3 : sig.captionWords <= 8 ? 1.2 : -0.5, "your caption is short enough to sit on the photo"); break;
    case "offer.countdown": if (sig.hasEndDate) bump(2.5, "counts down to the end of the offer"); break;
    case "offer.burst": bump(sig.hasOriginalPrice ? 2 : -1, "shows the saving at a glance"); break;
    case "offer.ticket": if (x.purpose === "event") bump(1.5, "reads like an entry ticket"); break;
    case "offer.luxury": if (tone === "premium") bump(1, "keeps the price understated"); break;
    case "details.calendar": if (sig.hasDate && x.purpose === "event") bump(1.8, "puts the date front and centre"); if (sig.detailCount >= 5) bump(-0.5); break;
    case "details.location": if (sig.hasLocation && (x.purpose === "food" || x.purpose === "event" || x.purpose === "product")) bump(1.2, "helps people find the place"); break;
    case "details.grid": case "details.columns": bump(sig.detailCount >= 5 ? 1 : sig.detailCount <= 2 ? -1 : 0, "lots of facts stay scannable"); break;
    case "details.timeline": if (sig.detailCount >= 3 && x.purpose === "event") bump(0.6, "reads like a programme"); break;
    case "cta.pill": case "cta.editorial": bump(sig.ctaLabelWords >= 5 ? -1.5 : 0); break;
    case "cta.floating": bump(sig.blockCount >= 7 ? 0.8 : -0.6, "a long poster keeps the button one tap away"); break;
    case "footer.social": if (sig.hasSocial) bump(1.5, "your social links close the poster"); break;
    case "footer.contact": if (sig.hasContact && (x.purpose === "service" || x.purpose === "food" || x.purpose === "product")) bump(1.5, "every way to reach you in one card"); break;
    case "footer.signature": bump(sig.footerWords >= 5 ? -2 : sig.footerWords <= 3 ? 1 : 0, "a short name makes a strong sign-off"); break;
    case "footer.closing": if (sig.footerWords >= 5) bump(0.8, "your footer line works as a closing statement"); break;
  }

  if (st.compatibility.worksOn === "dark" && !x.dark) bump(-1.5);
  if (st.compatibility.worksOn === "light" && x.dark) bump(-1.5);
  if (st.blockType !== "hero" && st.preview.energy > x.heroEnergy) bump(-1);
  if (st.blockType === "cta" && st.preview.energy >= 3) bump(0.4);
  if (x.previousFamily === st.compatibility.family) bump(-3.5);
  else if (x.used.has(st.compatibility.family)) bump(-2);

  score += rand() * 0.8;
  reasons.sort((a, b) => b[0] - a[0]);
  return { score, reason: reasons.slice(0, 2).map((r) => r[1]).join(" and ") };
}

function best(type: StyledBlockType, x: ScoreInput & { missingFor: (st: BlockVisualStyle) => Requirement[] }, rand: () => number) {
  let top: { st: BlockVisualStyle; score: number; reason: string } | null = null;
  for (const st of stylesFor(type)) {
    const r = scoreStyle(st, { ...x, missing: x.missingFor(st) }, rand);
    if (!top || r.score > top.score) top = { st, ...r };
  }
  return top!;
}

const SIGNAL_REQ: Record<Requirement, (s: ContentSignals) => boolean> = {
  image: (s) => s.hasImage, headline: () => true, price: () => true, endsAt: (s) => s.hasEndDate, "date-item": (s) => s.hasDate,
  "location-item": (s) => s.hasLocation, "social-links": (s) => s.hasSocial, contact: (s) => s.hasContact,
};

export interface TemplateStylePlan {
  styles: Record<StyledBlockType, string>;
  notes: string[];
}

/** Template-level choice: one style per block type, read top to bottom like a visitor would. */
export function chooseTemplateStyles(input: { primary: CreativeProfile; secondary: CreativeProfile; signals?: Partial<ContentSignals>; purpose?: Purpose; tone?: string; dark: boolean; order?: BlockType[] }, rand: () => number): TemplateStylePlan {
  const signals = { ...DEFAULT_SIGNALS, ...input.signals };
  const order = (input.order ?? [...STYLED_BLOCKS]).filter(isStyledBlock);
  for (const t of STYLED_BLOCKS) if (!order.includes(t)) order.push(t);
  const used = new Set<string>();
  const styles = {} as Record<StyledBlockType, string>;
  const notes: string[] = [];
  let heroEnergy = 5;
  let previousFamily: string | undefined;
  for (const type of order) {
    const pick = best(type, { ...input, signals, used, previousFamily, heroEnergy, missing: [], missingFor: (st) => st.requiredContent.filter((r) => !SIGNAL_REQ[r](signals)) }, rand);
    styles[type] = pick.st.id;
    used.add(pick.st.compatibility.family);
    previousFamily = pick.st.compatibility.family;
    if (type === "hero") heroEnergy = Math.max(3, pick.st.preview.energy);
    if (pick.reason && notes.length < 7) notes.push(`${LABEL[type]}: ${pick.st.name} — ${pick.reason}.`);
  }
  return { styles, notes };
}

/**
 * Campaign-level pass for a Wiby template: keeps the template's style wherever it fits, and swaps in
 * a better one when the block's real content can't use it (no photo, no end date…) or when it would
 * repeat the block right above it (two photos in a row, a second offer).
 */
export function curateCampaignStyles(blocks: Block[], t: { blocks: Partial<Record<BlockType, { variant?: string }>>; design?: { profile: ProfileId; blend: ProfileId[] } }, brief: DesignBrief = {}, slug?: string, dark = false): { blocks: Block[]; notes: string[] } {
  if (!t.design) return { blocks, notes: [] };
  const primary = getProfile(t.design.profile);
  const secondary = getProfile(t.design.blend[0] ?? t.design.profile);
  const ctx: StyleContext = styleContext(blocks, slug);
  const signals = signalsFromBlocks(blocks);
  const rand = seeded(blocks.map((b) => b.id).join("|"));
  const used = new Set<string>();
  const lastOfType = new Map<BlockType, string>();
  const notes: string[] = [];
  let previousFamily: string | undefined;
  let heroEnergy = 5;
  const out = blocks.map((b) => {
    if (!isStyledBlock(b.type)) { previousFamily = undefined; return b; }
    const preferred = getStyle(canonicalStyleId(b.type, t.blocks[b.type]?.variant) ?? defaultStyleId(b.type))!;
    const missing = missingRequirements(preferred, b, ctx);
    const repeatsType = lastOfType.get(b.type) === preferred.id;
    const repeatsNeighbour = previousFamily === preferred.compatibility.family;
    let chosen = preferred;
    if (missing.length || repeatsType || repeatsNeighbour) {
      const pick = best(b.type, { primary, secondary, signals, purpose: brief.purpose, tone: brief.tone, dark, used, previousFamily, heroEnergy, missing: [], missingFor: (st) => (st.id === preferred.id && (repeatsType || repeatsNeighbour) ? ["headline"] as Requirement[] : missingRequirements(st, b, ctx)) }, rand);
      chosen = pick.st;
      const why = missing.length ? `${preferred.name} needs content this block doesn't have yet` : repeatsType ? `so it doesn't repeat the ${LABEL[b.type].toLowerCase()} above` : "so neighbouring blocks don't look the same";
      notes.push(`${LABEL[b.type]}: ${chosen.name} — ${why}.`);
    }
    used.add(chosen.compatibility.family);
    previousFamily = chosen.compatibility.family;
    lastOfType.set(b.type, chosen.id);
    if (b.type === "hero") heroEnergy = Math.max(3, chosen.preview.energy);
    return chosen.id === preferred.id ? b : { ...b, style: { ...b.style, variant: chosen.id } };
  });
  return { blocks: out, notes };
}

function seeded(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  let a = h >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
