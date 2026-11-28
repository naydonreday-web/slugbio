import type { Campaign, CampaignStatus } from "./types";

export const DURATIONS = [
  { days: 7, label: "7 days", tagline: "Short-term promotion", price: 49 },
  { days: 14, label: "14 days", tagline: "Standard short campaign", price: 89 },
  { days: 30, label: "30 days", tagline: "Extended campaign", price: 149 },
  { days: 90, label: "90 days", tagline: "Long-running promotion", price: 349 },
] as const;

export const VAT_RATE = 0.15;
export const CURRENCY = "M";
export const PUBLIC_HOST = "slug.bio";

export function formatMoney(n: number): string {
  return `${CURRENCY}${n.toFixed(2)}`;
}

export function priceFor(days: number) {
  const d = DURATIONS.find((x) => x.days === days) ?? DURATIONS[0];
  const vat = Math.round(d.price * VAT_RATE * 100) / 100;
  return { subtotal: d.price, vat, total: Math.round((d.price + vat) * 100) / 100 };
}

export function expiryFrom(startsAt: Date, days: number): Date {
  return new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function deriveStatus(c: Pick<Campaign, "status" | "startsAt" | "expiresAt">, now = new Date()): CampaignStatus {
  if (c.status === "archived") return "archived";
  if (c.status === "draft" || !c.startsAt || !c.expiresAt) return "draft";
  const start = new Date(c.startsAt).getTime();
  const end = new Date(c.expiresAt).getTime();
  if (now.getTime() < start) return "scheduled";
  if (now.getTime() >= end) return "expired";
  return "active";
}

export function daysLeft(expiresAt?: string, now = new Date()): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86400000);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function publicPath(slug: string): string {
  return `/c/${slug}`;
}

/** Number of campaigns shown on the home dashboard; the rest live on the Campaigns page. */
export const HOME_RECENT_COUNT = 2;

/** Most recently edited campaigns that aren't archived, newest first. */
export function recentCampaigns<T extends Pick<Campaign, "status" | "startsAt" | "expiresAt" | "updatedAt">>(list: T[], count = HOME_RECENT_COUNT): T[] {
  return list
    .filter((c) => deriveStatus(c) !== "archived")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, count);
}
