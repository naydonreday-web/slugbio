import { beforeEach, describe, expect, it } from "vitest";
import { generateCampaign } from "@/lib/slag/generate";
import { buildSeedCampaigns } from "@/lib/slag/seed";
import { createBlock } from "@/lib/slag/blocks";
import { applyTemplate, checkCompatibility, renderLayout } from "@/lib/slag/templates/apply";
import { BROADSHEET, CLASSIC } from "@/lib/slag/templates/builtins";
import {
  BLOCK_REGISTRY,
  BLOCK_TYPES,
  isRegisteredBlockType,
  validateBlock,
} from "@/lib/slag/templates/registry";
import { validateTemplate } from "@/lib/slag/templates/schema";
import { getCollections, getTemplateConfig, resetTemplateStore } from "@/lib/slag/templates/store";
import { designTemplate, runWibyTemplateJob } from "@/lib/slag/templates/wiby";
import { contrastRatio } from "@/lib/slag/themes";
import {
  BLOCK_STYLES,
  missingRequirements,
  resolveBlockStyle,
  styleContext,
} from "@/lib/slag/templates/styles";
import type { Block, BlockType } from "@/lib/slag/types";

const answers = {
  title: "Jazz at the Mill",
  headline: "",
  description: "A night of live jazz. Bring friends.",
  audience: [],
  purpose: "event" as const,
  action: "register" as const,
  date: "Friday 4 Dec",
  venue: "Old Mill, Maseru",
};

beforeEach(() => resetTemplateStore());

describe("block registry", () => {
  it("covers exactly the nine SlagBio blocks", () => {
    expect([...BLOCK_TYPES].sort()).toEqual([
      "cta",
      "details",
      "footer",
      "form",
      "hero",
      "image",
      "offer",
      "social",
      "text",
    ]);
    expect(Object.keys(BLOCK_REGISTRY)).toHaveLength(9);
  });
  it("rejects block types that aren't registered", () => {
    expect(isRegisteredBlockType("carousel")).toBe(false);
    expect(
      validateBlock({ id: "x", type: "carousel", content: {}, style: {} } as unknown as Block).ok,
    ).toBe(false);
  });
  it("accepts every block in the sample campaigns", () => {
    for (const c of buildSeedCampaigns())
      for (const b of c.blocks) expect(validateBlock(b)).toEqual({ ok: true });
  });
});

describe("published style links", () => {
  it("uses the deployed workers.dev origin for QR destinations", () => {
    const campaign = buildSeedCampaigns()[0];
    const facts = styleContext(campaign.blocks, campaign.slug, "https://slagby-user.workers.dev/");
    expect(facts.url).toBe("https://slagby-user.workers.dev/c/neon-sunset-fest");
  });
});

describe("registered visual styles", () => {
  it("resolves all 50 styles and follows configured missing-content fallbacks", () => {
    for (const style of BLOCK_STYLES) {
      const block = createBlock(style.blockType as BlockType);
      const candidate = {
        ...block,
        content: {},
        style: { ...block.style, variant: style.id },
      } as Block;
      const context = styleContext([candidate], "style-check");
      const resolved = resolveBlockStyle(candidate, undefined, context);

      expect(resolved?.style.blockType).toBe(style.blockType);
      if (missingRequirements(style, candidate, context).length && style.compatibility.fallback) {
        expect(resolved?.style.id).toBe(style.compatibility.fallback);
      }
    }
  });
});

describe("template contract", () => {
  it("accepts both built-in templates", () => {
    expect(validateTemplate(CLASSIC).ok).toBe(true);
    expect(validateTemplate(BROADSHEET).ok).toBe(true);
  });
  it("rejects CSS or script smuggled into a template", () => {
    expect(validateTemplate({ ...CLASSIC, name: "<script>alert(1)</script>" }).ok).toBe(false);
    expect(
      validateTemplate({
        ...CLASSIC,
        tokens: {
          ...CLASSIC.tokens,
          colors: { ...CLASSIC.tokens.colors, bg: "url(javascript:x)" },
        },
      }).ok,
    ).toBe(false);
    expect(validateTemplate({ ...CLASSIC, customCss: "body{display:none}" }).ok).toBe(false);
  });
  it("rejects a layout variant the renderer doesn't know", () => {
    expect(
      validateTemplate({ ...CLASSIC, blocks: { ...CLASSIC.blocks, hero: { variant: "carousel" } } })
        .ok,
    ).toBe(false);
  });
  it("rejects unreadable button text", () => {
    const r = validateTemplate({
      ...CLASSIC,
      tokens: {
        ...CLASSIC.tokens,
        colors: { ...CLASSIC.tokens.colors, accent: "#ffffff", accentText: "#f5f5f5" },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.id === "button-contrast")?.ok).toBe(false);
  });
});

describe("templates control presentation, campaigns keep content", () => {
  it("switching templates keeps block ids, text, form fields and button destinations", () => {
    const original = generateCampaign({
      ...answers,
      action: "contact",
      whatsapp: "+266 5800 1234",
    });
    const switched = applyTemplate(original, BROADSHEET);
    expect(switched.blocks.map((b) => b.id)).toEqual(original.blocks.map((b) => b.id));
    expect(switched.blocks.map((b) => b.content)).toEqual(original.blocks.map((b) => b.content));
    expect(switched.blocks.find((b) => b.type === "cta")?.content.target).toBe("+266 5800 1234");
    expect(switched.template).toEqual({ id: "broadsheet", version: "1.0.0" });
  });
  it("keeps per-element formatting the user chose", () => {
    const c = generateCampaign(answers);
    c.blocks[0].style.elements = { headline: { italic: true } };
    expect(applyTemplate(c, BROADSHEET).blocks[0].style.elements).toEqual({
      headline: { italic: true },
    });
  });
  it("renders the same content two different ways", () => {
    const a = renderLayout(CLASSIC);
    const b = renderLayout(BROADSHEET);
    expect([a.styles.hero, a.styles.details, a.surface]).toEqual([
      "hero.cinematic",
      "details.boxed",
      "filled",
    ]);
    expect([b.styles.hero, b.styles.details, b.surface]).toEqual([
      "hero.editorial",
      "details.icon-list",
      "outline",
    ]);
    const c = generateCampaign(answers);
    expect(applyTemplate(c, CLASSIC).theme.bg).not.toBe(applyTemplate(c, BROADSHEET).theme.bg);
  });
  it("only reorders blocks for new campaigns", () => {
    const c = generateCampaign(answers);
    expect(applyTemplate(c, BROADSHEET).blocks.map((b) => b.type)).toEqual(
      c.blocks.map((b) => b.type),
    );
    const reordered = applyTemplate(c, BROADSHEET, { reorder: true }).blocks.map((b) => b.type);
    expect(reordered.indexOf("details")).toBeLessThan(reordered.indexOf("text"));
  });
  it("hides, but keeps, blocks a template doesn't support", () => {
    const c = generateCampaign(answers);
    const limited = {
      ...CLASSIC,
      supportedBlocks: CLASSIC.supportedBlocks.filter((t) => t !== "form"),
    };
    const compat = checkCompatibility(c.blocks, limited);
    expect(compat.hidden.map((h) => h.type)).toEqual(["form"]);
    expect(applyTemplate(c, limited).blocks.some((b) => b.type === "form")).toBe(true);
  });
  it("falls back to Classic for a missing template", () => {
    expect(getTemplateConfig({ id: "gone", version: "1.0.0" }).id).toBe("classic");
    expect(getTemplateConfig(undefined).id).toBe("classic");
  });
});

describe("Wiby template designer", () => {
  it("every design passes validation", () => {
    const inputs = [
      { purpose: "event" as const, tone: "Energetic" },
      { purpose: "food" as const, tone: "Calm" },
      { prompt: "dark green wedding invite", tone: "Premium" },
      {},
    ];
    for (const input of inputs)
      for (let attempt = 0; attempt < 8; attempt++) {
        const t = designTemplate(input, attempt);
        expect(validateTemplate(t).ok).toBe(true);
        expect(
          contrastRatio(t.tokens.colors.accentText, t.tokens.colors.accent),
        ).toBeGreaterThanOrEqual(4.5);
      }
  });
  it("saves a job, a validation, a draft, a version and a pending review", () => {
    const r = runWibyTemplateJob({ prompt: "a jazz night", purpose: "event" });
    expect(r.template).toBeDefined();
    const s = getCollections();
    const id = r.template!.id;
    expect(s.template_registry[id].status).toBe("pending_review");
    expect(Object.values(s.template_jobs)[0]).toMatchObject({ status: "done", templateId: id });
    expect(Object.values(s.template_validation)[0].ok).toBe(true);
    expect(Object.values(s.template_drafts)[0].templateId).toBe(id);
    expect(Object.values(s.template_reviews)[0]).toMatchObject({
      templateId: id,
      status: "pending",
    });
    expect(getTemplateConfig({ id, version: "1.0.0" }).id).toBe(id);
  });
});
