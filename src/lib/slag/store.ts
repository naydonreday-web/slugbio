import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { uid } from "./blocks";
import { deriveStatus, expiryFrom, slugify } from "./publishing";
import { buildSeedCampaigns } from "./seed";
import type { Campaign, Payment, WizardAnswers } from "./types";
import type { Profile } from "./profile";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadAccountData,
  removeCampaign as removeCloudCampaign,
  trackCampaignMetric as trackCloudCampaignMetric,
  saveCampaign as saveCloudCampaign,
  saveProfile as saveCloudProfile,
} from "@/lib/supabase/data";

const KEY = "slagbio:v1";
const WIZARD_KEY = "slagbio:wizard";

export interface Prefs {
  cursor: boolean;
}
export interface StoreState {
  ready: boolean;
  campaigns: Campaign[];
  prefs: Prefs;
  profile?: Profile;
}

const SERVER_STATE: StoreState = { ready: false, campaigns: [], prefs: { cursor: false } };
let state: StoreState = SERVER_STATE;
let currentUserId: string | null = null;
const listeners = new Set<() => void>();

function storageKey(userId = currentUserId) {
  return userId ? `${KEY}:${userId}` : KEY;
}

function emit() {
  listeners.forEach((l) => l());
}

function read(userId = currentUserId): StoreState {
  if (isSupabaseConfigured() && !userId)
    return { ready: true, campaigns: [], prefs: { cursor: true } };
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreState>;
      if (Array.isArray(parsed.campaigns)) {
        return {
          ready: true,
          campaigns: parsed.campaigns,
          prefs: { cursor: true, ...(parsed.prefs ?? {}) },
          profile: parsed.profile,
        };
      }
    }
  } catch {
    /* fall through to seeds */
  }
  return {
    ready: true,
    campaigns: !isSupabaseConfigured() && !userId ? buildSeedCampaigns() : [],
    prefs: { cursor: true },
  };
}

let warned = false;
function persist() {
  try {
    window.localStorage.setItem(
      storageKey(),
      JSON.stringify({ campaigns: state.campaigns, prefs: state.prefs, profile: state.profile }),
    );
    warned = false;
  } catch {
    if (!warned) {
      warned = true;
      toast.error("Your browser storage is full", {
        description:
          "Try using smaller images or removing old drafts. Recent changes may not be saved.",
      });
    }
  }
}

function ensureLoaded() {
  if (typeof window === "undefined" || state.ready) return;
  state = read();
  persist();
}

function subscribe(l: () => void) {
  listeners.add(l);
  ensureLoaded();
  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey()) {
      state = read(currentUserId);
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return state;
}
function getServerSnapshot() {
  return SERVER_STATE;
}

function syncCloud(previous: Campaign[], next: Campaign[]) {
  if (!currentUserId || !isSupabaseConfigured()) return;
  const oldById = new Map(previous.map((c) => [c.id, c]));
  const nextById = new Map(next.map((c) => [c.id, c]));
  for (const [id, oldCampaign] of oldById) {
    if (!nextById.has(id)) {
      void removeCloudCampaign(id).catch(() =>
        toast.error("Couldn't delete the campaign from your account."),
      );
    } else if (JSON.stringify(oldCampaign) !== JSON.stringify(nextById.get(id))) {
      const updated = nextById.get(id)!;
      void saveCloudCampaign(currentUserId, updated).catch(() =>
        toast.error("Couldn't save your campaign. Check your connection and try again."),
      );
    }
  }
  for (const [id, campaign] of nextById) {
    if (!oldById.has(id))
      void saveCloudCampaign(currentUserId, campaign).catch(() =>
        toast.error("Couldn't save your campaign. Check your connection and try again."),
      );
  }
}

function set(fn: (s: StoreState) => StoreState, sync = true) {
  ensureLoaded();
  const previousCampaigns = state.campaigns;
  state = fn(state);
  persist();
  if (sync) syncCloud(previousCampaigns, state.campaigns);
  emit();
}

/** Switch the browser store to one authenticated account and hydrate it from Supabase. */
export function setAuthenticatedUser(userId: string | null) {
  if (currentUserId === userId) return;
  currentUserId = userId;
  if (!userId) {
    state = read(null);
    emit();
    return;
  }

  const cached = read(userId);
  state = { ...cached, ready: false };
  emit();
  void loadAccountData(userId)
    .then((remote) => {
      if (currentUserId !== userId) return;
      state = { ...state, campaigns: remote.campaigns, profile: remote.profile, ready: true };
      persist();
      emit();
    })
    .catch(() => {
      if (currentUserId !== userId) return;
      state = { ...state, ready: true };
      toast.error("Couldn't load your campaigns", {
        description: "Check your connection and refresh the page.",
      });
      emit();
    });
}

/** Remove private account data cached in this browser after the account is deleted. */
export function clearAccountDataCache(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
    window.localStorage.removeItem(WIZARD_KEY);
  } catch {
    /* The remote account has already been deleted; local storage can be cleared on next sign-out. */
  }
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCampaign(id: string): { ready: boolean; campaign: Campaign | undefined } {
  const s = useStore();
  return { ready: s.ready, campaign: s.campaigns.find((c) => c.id === id) };
}

export function useCampaignBySlug(slug: string): {
  ready: boolean;
  campaign: Campaign | undefined;
} {
  const s = useStore();
  return { ready: s.ready, campaign: s.campaigns.find((c) => c.slug === slug) };
}

export function getCampaign(id: string): Campaign | undefined {
  ensureLoaded();
  return state.campaigns.find((c) => c.id === id);
}

export function isSlugTaken(slug: string, excludeId?: string): boolean {
  ensureLoaded();
  return state.campaigns.some((c) => c.slug === slug && c.id !== excludeId);
}

export function uniqueSlug(base: string, excludeId?: string): string {
  const root = slugify(base) || "campaign";
  let slug = root;
  let n = 2;
  while (isSlugTaken(slug, excludeId)) slug = `${root}-${n++}`;
  return slug;
}

export function addCampaign(c: Campaign): Campaign {
  const withSlug = { ...c, slug: uniqueSlug(c.slug || c.title, c.id) };
  set((s) => ({ ...s, campaigns: [withSlug, ...s.campaigns] }));
  return withSlug;
}

export function replaceCampaign(c: Campaign) {
  set((s) => ({
    ...s,
    campaigns: s.campaigns.map((x) =>
      x.id === c.id ? { ...c, updatedAt: new Date().toISOString() } : x,
    ),
  }));
}

export function updateCampaign(id: string, fn: (c: Campaign) => Campaign) {
  set((s) => ({
    ...s,
    campaigns: s.campaigns.map((x) =>
      x.id === id ? { ...fn(x), updatedAt: new Date().toISOString() } : x,
    ),
  }));
}

export function deleteCampaign(id: string) {
  set((s) => ({ ...s, campaigns: s.campaigns.filter((c) => c.id !== id) }));
}

export function duplicateCampaign(id: string): Campaign | undefined {
  const c = getCampaign(id);
  if (!c) return;
  const now = new Date().toISOString();
  const copy: Campaign = {
    ...JSON.parse(JSON.stringify(c)),
    id: uid("c"),
    title: `${c.title} (copy)`,
    status: "draft",
    visibility: "private",
    startsAt: undefined,
    expiresAt: undefined,
    durationDays: undefined,
    views: 0,
    ctaClicks: 0,
    shares: 0,
    daily: {},
    responses: [],
    payments: [],
    createdAt: now,
    updatedAt: now,
  };
  return addCampaign(copy);
}

export async function publishCampaign(
  id: string,
  opts: {
    slug: string;
    startsAt: Date;
    days: number;
    visibility: "private" | "public";
    payment?: Omit<Payment, "id" | "paidAt" | "durationDays">;
  },
) {
  const current = getCampaign(id);
  if (!current) throw new Error("Campaign not found.");

  // Renewal of a still-running campaign extends from its current expiry.
  const status = deriveStatus(current);
  const start =
    status === "active" &&
    current.expiresAt &&
    opts.startsAt.getTime() < new Date(current.expiresAt).getTime()
      ? new Date(current.startsAt!)
      : opts.startsAt;
  const end =
    status === "active" && current.expiresAt
      ? expiryFrom(new Date(current.expiresAt), opts.days)
      : expiryFrom(opts.startsAt, opts.days);
  const updated: Campaign = {
    ...current,
    slug: opts.slug,
    status: "published",
    visibility: opts.visibility,
    startsAt: start.toISOString(),
    expiresAt: end.toISOString(),
    durationDays: opts.days,
    payments: opts.payment
      ? [
          ...current.payments,
          {
            ...opts.payment,
            id: uid("pay"),
            paidAt: new Date().toISOString(),
            durationDays: opts.days,
          },
        ]
      : current.payments,
    updatedAt: new Date().toISOString(),
  };

  // Save remotely before making the share dialog available. The unique slug
  // constraint remains the final guard against concurrent claims.
  let publishingUserId: string | null = null;
  if (isSupabaseConfigured()) {
    if (!currentUserId) throw new Error("Sign in before publishing this campaign.");
    publishingUserId = currentUserId;
    await saveCloudCampaign(publishingUserId, updated);
    if (currentUserId !== publishingUserId)
      throw new Error("The signed-in account changed while publishing.");
  }

  set(
    (s) => ({
      ...s,
      campaigns: s.campaigns.map((campaign) => (campaign.id === id ? updated : campaign)),
    }),
    false,
  );
}

export function archiveCampaign(id: string, archived: boolean) {
  updateCampaign(id, (c) => ({
    ...c,
    status: archived ? "archived" : c.startsAt && c.expiresAt ? "published" : "draft",
  }));
}

function bump(c: Campaign, key: "views" | "clicks" | "responses"): Campaign["daily"] {
  const k = new Date().toISOString().slice(0, 10);
  const d = c.daily[k] ?? { views: 0, clicks: 0, responses: 0 };
  return { ...c.daily, [k]: { ...d, [key]: d[key] + 1 } };
}

export function recordView(id: string) {
  if (isSupabaseConfigured()) void trackCloudCampaignMetric(id, "view").catch(() => {});
  updateCampaign(id, (c) => ({ ...c, views: c.views + 1, daily: bump(c, "views") }));
}
export function recordClick(id: string) {
  if (isSupabaseConfigured()) void trackCloudCampaignMetric(id, "click").catch(() => {});
  updateCampaign(id, (c) => ({ ...c, ctaClicks: c.ctaClicks + 1, daily: bump(c, "clicks") }));
}
export function recordShare(id: string) {
  if (isSupabaseConfigured()) void trackCloudCampaignMetric(id, "share").catch(() => {});
  updateCampaign(id, (c) => ({ ...c, shares: c.shares + 1 }));
}
export function removeResponseLocal(campaignId: string, responseId: string) {
  ensureLoaded();
  state = {
    ...state,
    campaigns: state.campaigns.map((campaign) =>
      campaign.id === campaignId
        ? {
            ...campaign,
            responses: campaign.responses.filter((response) => response.id !== responseId),
          }
        : campaign,
    ),
  };
  persist();
  emit();
}

export function setCursorPref(on: boolean) {
  set((s) => ({ ...s, prefs: { ...s.prefs, cursor: on } }));
}

export function saveProfile(profile: Profile) {
  set((s) => ({ ...s, profile }));
  if (currentUserId && isSupabaseConfigured()) {
    void saveCloudProfile(currentUserId, profile).catch(() =>
      toast.error("Couldn't save your profile. Check your connection and try again."),
    );
  }
}

export function resetDemoData() {
  set((s) => ({ ...s, campaigns: buildSeedCampaigns() }));
}

// ---------- Wizard draft (preserves answers across back/forward and reloads) ----------
export function loadWizard(): { step: number; answers: WizardAnswers } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WIZARD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function saveWizard(v: { step: number; answers: WizardAnswers }) {
  try {
    window.localStorage.setItem(WIZARD_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}
export function clearWizard() {
  try {
    window.localStorage.removeItem(WIZARD_KEY);
  } catch {
    /* ignore */
  }
}
