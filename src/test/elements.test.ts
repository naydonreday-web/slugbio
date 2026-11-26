import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { interpretElement } from "@/lib/slag/assistant";
import { createBlock } from "@/lib/slag/blocks";
import { elementCss, isBold, setElementStyle } from "@/lib/slag/elements";
import { HOME_RECENT_COUNT, recentCampaigns } from "@/lib/slag/publishing";
import type { Campaign } from "@/lib/slag/types";

const poster = (): Campaign => {
  const hero = createBlock("hero");
  hero.id = "hero1";
  return { id: "c1", slug: "c1", title: "Test", purpose: "event", status: "draft", visibility: "private", theme: { id: "t", name: "t", bg: "#ffffff", surface: "#f3ede2", text: "#141414", muted: "#555555", accent: "#FF5E3A", accentText: "#ffffff", font: "jakarta", radius: 20 }, blocks: [hero], createdAt: "", updatedAt: "", views: 0, ctaClicks: 0, shares: 0, daily: {}, responses: [], payments: [] };
};

describe("element formatting", () => {
  it("headline is bold by default and turning bold off renders weight 400", () => {
    const hero = createBlock("hero");
    expect(isBold(hero, "headline")).toBe(true);
    const off = setElementStyle(hero, "headline", { bold: false });
    expect(isBold(off, "headline")).toBe(false);
    expect(elementCss(off, "headline").fontWeight).toBe(400);
  });

  it("italic, underline and font apply only to the chosen element", () => {
    const hero = setElementStyle(createBlock("hero"), "subtitle", { italic: true, underline: true, font: "fraunces" });
    const css = elementCss(hero, "subtitle");
    expect(css.fontStyle).toBe("italic");
    expect(css.textDecorationLine).toBe("underline");
    expect(String(css.fontFamily)).toContain("Fraunces");
    expect(elementCss(hero, "headline")).toEqual({});
  });

  it("clearing every setting removes the element's formatting", () => {
    const hero = setElementStyle(setElementStyle(createBlock("hero"), "eyebrow", { italic: true }), "eyebrow", { italic: undefined });
    expect(hero.style.elements?.eyebrow).toBeUndefined();
  });
});

describe("AI on a selected element", () => {
  it("'make it italic' styles only the selected headline", () => {
    const r = interpretElement("make it italic", poster(), "hero1", "headline");
    const hero = r?.campaign?.blocks[0];
    expect(hero?.style.elements?.headline?.italic).toBe(true);
    expect(hero?.style.elements?.subtitle).toBeUndefined();
  });

  it("quoted text replaces the selected element's wording", () => {
    const r = interpretElement('change it to "Doors open at 7"', poster(), "hero1", "subtitle");
    expect(r?.campaign?.blocks[0].content.subtitle).toBe("Doors open at 7");
  });

  it("falls back to whole-poster handling for unrelated requests", () => {
    expect(interpretElement("add a registration form", poster(), "hero1", "headline")).toBeNull();
  });
});

describe("home dashboard", () => {
  const at = (id: string, updatedAt: string, status: Campaign["status"] = "draft") => ({ id, status, updatedAt, startsAt: undefined, expiresAt: undefined });

  it("shows the 2 most recently edited campaigns, skipping archived ones", () => {
    const list = [at("a", "2026-01-01"), at("b", "2026-03-01"), at("c", "2026-04-01", "archived"), at("d", "2026-02-01")];
    expect(HOME_RECENT_COUNT).toBe(2);
    expect(recentCampaigns(list).map((c) => c.id)).toEqual(["b", "d"]);
  });

  it("has a dedicated page for all campaigns", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/campaigns").at(-1)?.routeId).toBe("/campaigns/");
  });
});
