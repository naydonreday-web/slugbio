import { BLOCK_REGISTRY_VERSION, BLOCK_TYPES } from "./registry";
import { templateSchema, type TemplateConfig } from "./schema";

/** The original SlagBio look. Campaigns without a template render with it, unchanged. */
export const CLASSIC: TemplateConfig = templateSchema.parse({
  schemaVersion: 1,
  id: "classic",
  version: "1.0.0",
  name: "Classic",
  description: "Full-bleed photo hero, soft cards and pill buttons — the original SlagBio poster.",
  category: "general",
  tags: ["bold", "photo", "cards"],
  source: "builtin",
  tokens: { colors: { bg: "#ffffff", surface: "#f3ede2", text: "#0d0d0d", muted: "#555555", accent: "#ff5e3a", accentText: "#ffffff" }, radius: 999 },
  typography: { display: "jakarta", body: "jakarta", headingWeight: 700, headingCase: "none", tracking: "normal", eyebrow: "pill" },
  layout: { width: "regular", surface: "filled", dividers: false, blockOrder: [...BLOCK_TYPES] },
  blocks: {
    hero: { variant: "overlay", align: "center", padding: 56, headingScale: 1.2 },
    text: { align: "left", padding: 36, headingScale: 0.9 },
    image: { padding: 20 },
    offer: { align: "center", padding: 44 },
    details: { variant: "cards", align: "left", padding: 36, headingScale: 0.85 },
    cta: { align: "center", padding: 32 },
    form: { align: "left", padding: 40, headingScale: 0.9 },
    social: { align: "center", padding: 32 },
    footer: { align: "center", padding: 28 },
  },
  responsive: { mobile: { paddingScale: 1 }, desktop: { paddingScale: 1, detailsColumns: 3 } },
  previewImage: "lib:community",
  supportedBlocks: [...BLOCK_TYPES],
  compatibility: { blockRegistry: BLOCK_REGISTRY_VERSION, unsupported: "hide" },
});

/** Test template: the same blocks drawn as a newspaper page — stacked photo, serif headlines, ruled lists. */
export const BROADSHEET: TemplateConfig = templateSchema.parse({
  schemaVersion: 1,
  id: "broadsheet",
  version: "1.0.0",
  name: "Broadsheet",
  description: "Newsprint page with serif headlines, a framed photo, ruled sections and square buttons.",
  category: "general",
  tags: ["editorial", "serif", "minimal"],
  source: "builtin",
  tokens: { colors: { bg: "#f4f1ea", surface: "#e9e4d8", text: "#161513", muted: "#57534a", accent: "#b8321a", accentText: "#ffffff" }, radius: 0 },
  typography: { display: "fraunces", body: "jakarta", headingWeight: 600, headingCase: "none", tracking: "tight", eyebrow: "text" },
  layout: { width: "narrow", surface: "outline", dividers: true, blockOrder: ["hero", "details", "text", "image", "offer", "cta", "form", "social", "footer"] },
  blocks: {
    hero: { variant: "stacked", align: "left", padding: 36, headingScale: 1.1 },
    text: { align: "left", padding: 40, headingScale: 0.85 },
    image: { padding: 24 },
    offer: { align: "left", padding: 40 },
    details: { variant: "list", align: "left", padding: 32, headingScale: 0.75 },
    cta: { align: "left", padding: 36 },
    form: { align: "left", padding: 40, headingScale: 0.85 },
    social: { align: "left", padding: 28 },
    footer: { align: "left", padding: 28 },
  },
  responsive: { mobile: { paddingScale: 0.9 }, desktop: { paddingScale: 1.25, detailsColumns: 1 } },
  supportedBlocks: [...BLOCK_TYPES],
  compatibility: { blockRegistry: BLOCK_REGISTRY_VERSION, unsupported: "hide" },
});

export const BUILTIN_TEMPLATES: TemplateConfig[] = [CLASSIC, BROADSHEET];
