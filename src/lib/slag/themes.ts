import type { Theme } from "./types";

export const THEMES: Theme[] = [
  { id: "sunset-neon", name: "Sunset Neon", bg: "#1a0b2e", surface: "#2a1248", text: "#fff4ec", muted: "#d9c2e8", accent: "#ff5e8a", accentText: "#1a0b2e", font: "bricolage", radius: 18 },
  { id: "warm-kraft", name: "Warm Kraft", bg: "#f4ead9", surface: "#ead9bf", text: "#2b1d12", muted: "#6e5843", accent: "#8a4b22", accentText: "#fff8ef", font: "fraunces", radius: 10 },
  { id: "studio-mono", name: "Studio Mono", bg: "#ffffff", surface: "#f3ede2", text: "#0d0d0d", muted: "#555555", accent: "#ff5e3a", accentText: "#ffffff", font: "jakarta", radius: 999 },
  { id: "fresh-market", name: "Fresh Market", bg: "#f6f8ec", surface: "#e4edc7", text: "#1f3312", muted: "#4f6340", accent: "#d6ed7a", accentText: "#1f3312", font: "bricolage", radius: 14 },
  { id: "midnight-gold", name: "Midnight Premium", bg: "#0d0d0f", surface: "#1a1a1e", text: "#f5efe2", muted: "#a59f93", accent: "#d4a95a", accentText: "#0d0d0f", font: "fraunces", radius: 4 },
  { id: "forest", name: "Deep Forest", bg: "#14301f", surface: "#1d4029", text: "#eef6e9", muted: "#a9c4a8", accent: "#d6ed7a", accentText: "#14301f", font: "jakarta", radius: 12 },
  { id: "ocean-teal", name: "Ocean Teal", bg: "#eaf4f7", surface: "#cfe5ec", text: "#0f2f3a", muted: "#41606b", accent: "#326578", accentText: "#ffffff", font: "jakarta", radius: 16 },
  { id: "citrus-pop", name: "Citrus Pop", bg: "#fff6e9", surface: "#ffe2c7", text: "#2a1406", muted: "#7a5038", accent: "#ff5e3a", accentText: "#ffffff", font: "bricolage", radius: 999 },
];

export function getTheme(id: string): Theme {
  return { ...(THEMES.find((t) => t.id === id) ?? THEMES[2]) };
}

export const POSTER_FONTS: Record<string, { label: string; family: string }> = {
  jakarta: { label: "Modern sans", family: "'Plus Jakarta Sans', sans-serif" },
  fraunces: { label: "Editorial serif", family: "'Fraunces', Georgia, serif" },
  bricolage: { label: "Bold grotesque", family: "'Bricolage Grotesque', sans-serif" },
};

/** Suggest three themes from purpose + tone (step 5 of the wizard). */
export function suggestThemes(purpose?: string, tone?: string): string[] {
  const t = (tone ?? "").toLowerCase();
  if (t.includes("premium") || t.includes("elegant")) return ["midnight-gold", "warm-kraft", "studio-mono"];
  if (t.includes("playful") || t.includes("energetic")) return ["citrus-pop", "sunset-neon", "fresh-market"];
  if (t.includes("calm") || t.includes("trust")) return ["ocean-teal", "studio-mono", "forest"];
  switch (purpose) {
    case "event": return ["sunset-neon", "citrus-pop", "midnight-gold"];
    case "food": return ["warm-kraft", "fresh-market", "citrus-pop"];
    case "product": return ["studio-mono", "midnight-gold", "citrus-pop"];
    case "service": return ["studio-mono", "ocean-teal", "forest"];
    case "offer": return ["citrus-pop", "studio-mono", "sunset-neon"];
    case "announcement": return ["ocean-teal", "studio-mono", "forest"];
    default: return ["studio-mono", "fresh-market", "ocean-teal"];
  }
}

const NAMED_COLORS: Record<string, string> = {
  "dark green": "#14301f", "forest green": "#1d4029", green: "#2f6b3a", "light green": "#e4edc7", lime: "#d6ed7a",
  "dark blue": "#0f1e3a", navy: "#13213f", blue: "#2563eb", "light blue": "#e0f0fb", teal: "#326578", turquoise: "#18a3a3",
  black: "#0d0d0f", white: "#ffffff", cream: "#f6efe1", beige: "#efe4d2", grey: "#e6e6e6", gray: "#e6e6e6", "dark grey": "#2b2b2e", charcoal: "#222226",
  red: "#d7263d", coral: "#ff5e3a", orange: "#ff8a3d", peach: "#ffd8c2", yellow: "#ffd23f", gold: "#d4a95a",
  pink: "#ff5e8a", "hot pink": "#ff2e7e", "light pink": "#ffe0ea", purple: "#6b2fb3", "dark purple": "#1a0b2e", lavender: "#e8defa",
  brown: "#5b3a24", maroon: "#5a1020", burgundy: "#6d1a2c",
};

export function parseColor(text: string): { name: string; hex: string } | null {
  const t = text.toLowerCase();
  const hex = t.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/);
  if (hex) return { name: hex[0], hex: hex[0] };
  const names = Object.keys(NAMED_COLORS).sort((a, b) => b.length - a.length);
  for (const n of names) {
    if (new RegExp(`\\b${n}\\b`).test(t)) return { name: n, hex: NAMED_COLORS[n] };
  }
  return null;
}

export function isDark(hex: string): boolean {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

export function mix(hex: string, other: string, amount: number): string {
  const p = (x: string) => {
    const h = x.replace("#", "");
    const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  };
  const a = p(hex);
  const b = p(other);
  return (
    "#" +
    a
      .map((v, i) => Math.round(v + (b[i] - v) * amount))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Build a coherent theme around a new page background colour. */
export function themeFromBackground(base: Theme, bg: string): Theme {
  const dark = isDark(bg);
  return {
    ...base,
    bg,
    surface: mix(bg, dark ? "#ffffff" : "#000000", dark ? 0.08 : 0.06),
    text: dark ? "#f5f2ea" : "#141414",
    muted: dark ? mix(bg, "#ffffff", 0.65) : mix(bg, "#000000", 0.55),
    accentText: isDark(base.accent) ? "#ffffff" : "#141414",
  };
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(f.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The accent when it reads against `surface` at `min` contrast, otherwise the fallback (usually the text colour). */
export function readableAccent(accent: string, surface: string, fallback: string, min: number): string {
  return contrastRatio(accent, surface) >= min ? accent : fallback;
}
