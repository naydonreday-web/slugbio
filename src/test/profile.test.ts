import { describe, expect, it } from "vitest";
import { formatLesothoPhone, parseLesothoPhone, profileSchema } from "@/lib/slag/profile";

describe("Lesotho phone numbers", () => {
  it("accepts an 8-digit local mobile number and adds +266", () => {
    expect(parseLesothoPhone("5800 1234")).toEqual({ ok: true, e164: "+26658001234" });
  });
  it("accepts numbers already written with +266 or 00266", () => {
    expect(parseLesothoPhone("+266 6312-4567")).toEqual({ ok: true, e164: "+26663124567" });
    expect(parseLesothoPhone("00266 2231 0000")).toEqual({ ok: true, e164: "+26622310000" });
  });
  it("rejects other countries' numbers", () => {
    expect(parseLesothoPhone("+27 82 123 4567").ok).toBe(false);
  });
  it("rejects numbers that are not 8 digits", () => {
    expect(parseLesothoPhone("5800 123").ok).toBe(false);
    expect(parseLesothoPhone("5800 12345").ok).toBe(false);
  });
  it("rejects numbers that don't start with 2, 5 or 6", () => {
    expect(parseLesothoPhone("8800 1234").ok).toBe(false);
  });
  it("formats for display", () => {
    expect(formatLesothoPhone("+26658001234")).toBe("+266 5800 1234");
  });
});

describe("Onboarding profile", () => {
  it("requires a name", () => {
    expect(profileSchema.safeParse({ name: " ", phone: "58001234" }).success).toBe(false);
  });
  it("treats intended usage as optional", () => {
    const r = profileSchema.safeParse({ name: "Lerato", phone: "58001234" });
    expect(r.success && r.data.usage).toEqual([]);
  });
});
