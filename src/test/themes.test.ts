import { describe, expect, it } from "vitest";
import { contrastRatio, readableAccent } from "@/lib/slag/themes";

describe("poster accent readability", () => {
  it("measures black on white as 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
  it("keeps a pink accent used as text on the dark Sunset Neon page", () => {
    expect(readableAccent("#ff5e8a", "#1a0b2e", "#fff4ec", 4.5)).toBe("#ff5e8a");
  });
  it("falls back to the text colour for lime accent text on the light Fresh Market page", () => {
    expect(readableAccent("#d6ed7a", "#f6f8ec", "#1f3312", 3)).toBe("#1f3312");
  });
});
