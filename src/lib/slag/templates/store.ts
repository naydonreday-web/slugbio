import { useSyncExternalStore } from "react";
import { uid } from "../blocks";
import type { TemplateRef } from "../types";
import { BUILTIN_TEMPLATES, CLASSIC } from "./builtins";
import { blockRegistrySnapshot } from "./registry";
import { validateTemplate, type TemplateConfig, type ValidationCheck } from "./schema";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { loadHostedTemplates, submitHostedTemplate } from "@/lib/supabase/templates";

/**
 * Template collections, kept in this browser for now. The names and record shapes match the
 * collections a hosted backend will use, so moving them later is a copy, not a redesign.
 */
export type TemplateStatus = "draft" | "pending_review" | "approved" | "rejected";

export interface RegistryEntry {
  id: string;
  name: string;
  source: TemplateConfig["source"];
  status: TemplateStatus;
  currentVersion: string;
  publishedVersion?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
export interface DraftEntry {
  id: string;
  templateId: string;
  version: string;
  config: TemplateConfig;
  createdAt: string;
}
export interface VersionEntry {
  key: string;
  templateId: string;
  version: string;
  config: TemplateConfig;
  createdAt: string;
}
export interface JobEntry {
  id: string;
  kind: "wiby-generate";
  status: "running" | "done" | "failed";
  input: Record<string, unknown>;
  templateId?: string;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}
export interface ReviewEntry {
  id: string;
  templateId: string;
  version: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  note?: string;
}
export interface ValidationEntry {
  id: string;
  templateId?: string;
  version?: string;
  jobId?: string;
  ok: boolean;
  checks: ValidationCheck[];
  at: string;
}

export interface TemplateCollections {
  template_registry: Record<string, RegistryEntry>;
  template_drafts: Record<string, DraftEntry>;
  template_versions: Record<string, VersionEntry>;
  template_jobs: Record<string, JobEntry>;
  template_reviews: Record<string, ReviewEntry>;
  template_validation: Record<string, ValidationEntry>;
  block_registry: ReturnType<typeof blockRegistrySnapshot>;
}

const KEY = "slagbio:templates:v1";
let currentUserId: string | null = null;
const empty = (): TemplateCollections => ({
  template_registry: {},
  template_drafts: {},
  template_versions: {},
  template_jobs: {},
  template_reviews: {},
  template_validation: {},
  block_registry: blockRegistrySnapshot(),
});

let state: TemplateCollections | null = null;
const listeners = new Set<() => void>();
const SERVER: TemplateCollections = empty();

function load(): TemplateCollections {
  if (state) return state;
  if (typeof window === "undefined") return SERVER;
  if (isSupabaseConfigured() && !currentUserId) return (state = empty());
  try {
    const raw = window.localStorage.getItem(currentUserId ? `${KEY}:${currentUserId}` : KEY);
    state = raw
      ? { ...empty(), ...JSON.parse(raw), block_registry: blockRegistrySnapshot() }
      : empty();
  } catch {
    state = empty();
  }
  return state!;
}

function save(next: TemplateCollections) {
  state = next;
  try {
    window.localStorage.setItem(
      currentUserId ? `${KEY}:${currentUserId}` : KEY,
      JSON.stringify(next),
    );
  } catch {
    /* storage full — the template still works for this session */
  }
  listeners.forEach((l) => l());
}

export const versionKey = (id: string, version: string) => `${id}@${version}`;

/** Loads a template by reference: built-ins first, then saved versions. Unknown or invalid → Classic. */
export function getTemplateConfig(ref?: TemplateRef | null): TemplateConfig {
  if (!ref) return CLASSIC;
  const builtin = BUILTIN_TEMPLATES.find((t) => t.id === ref.id);
  if (builtin) return builtin;
  const v = load().template_versions[versionKey(ref.id, ref.version)];
  if (!v) return CLASSIC;
  const check = validateTemplate(v.config);
  return check.template ?? CLASSIC;
}

export function hasTemplate(ref: TemplateRef): boolean {
  return (
    BUILTIN_TEMPLATES.some((t) => t.id === ref.id) ||
    !!load().template_versions[versionKey(ref.id, ref.version)]
  );
}

/** Templates this browser can use: built-ins plus every Wiby draft that passed validation. */
export function listTemplates(): { config: TemplateConfig; status: TemplateStatus }[] {
  const s = load();
  const own = Object.values(s.template_registry).flatMap((r) => {
    const listed: { config: TemplateConfig; status: TemplateStatus }[] = [];
    const published = r.publishedVersion
      ? s.template_versions[versionKey(r.id, r.publishedVersion)]
      : undefined;
    if (published) listed.push({ config: published.config, status: "approved" });
    const current = s.template_versions[versionKey(r.id, r.currentVersion)];
    if (current && r.currentVersion !== r.publishedVersion) {
      listed.push({ config: current.config, status: r.status });
    }
    return listed;
  });
  return [...BUILTIN_TEMPLATES.map((config) => ({ config, status: "approved" as const })), ...own];
}

export function startJob(input: Record<string, unknown>): JobEntry {
  const s = load();
  const job: JobEntry = {
    id: uid("job"),
    kind: "wiby-generate",
    status: "running",
    input,
    startedAt: new Date().toISOString(),
  };
  save({ ...s, template_jobs: { ...s.template_jobs, [job.id]: job } });
  return job;
}

export function finishJob(id: string, patch: Pick<JobEntry, "status"> & Partial<JobEntry>) {
  const s = load();
  const job = s.template_jobs[id];
  if (!job) return;
  save({
    ...s,
    template_jobs: {
      ...s.template_jobs,
      [id]: { ...job, ...patch, finishedAt: new Date().toISOString() },
    },
  });
}

export function recordValidation(entry: Omit<ValidationEntry, "id" | "at">): ValidationEntry {
  const s = load();
  const v: ValidationEntry = { ...entry, id: uid("val"), at: new Date().toISOString() };
  save({ ...s, template_validation: { ...s.template_validation, [v.id]: v } });
  return v;
}

/**
 * Saves a validated template as a draft version and submits it for review. The creator can use
 * it straight away; it only becomes available to everyone once an administrator approves it.
 */
export function saveDraftForReview(config: TemplateConfig, createdBy = "wiby"): RegistryEntry {
  const check = validateTemplate(config);
  if (!check.template) throw new Error("Template failed validation");
  const t = check.template;
  const s = load();
  const now = new Date().toISOString();
  const key = versionKey(t.id, t.version);
  const ownerId = currentUserId ?? createdBy;
  const entry: RegistryEntry = {
    id: t.id,
    name: t.name,
    source: t.source,
    status: "pending_review",
    currentVersion: t.version,
    publishedVersion: s.template_registry[t.id]?.publishedVersion,
    createdAt: s.template_registry[t.id]?.createdAt ?? now,
    updatedAt: now,
    createdBy: ownerId,
  };
  const draft: DraftEntry = {
    id: uid("draft"),
    templateId: t.id,
    version: t.version,
    config: t,
    createdAt: now,
  };
  const review: ReviewEntry = {
    id: uid("rev"),
    templateId: t.id,
    version: t.version,
    status: "pending",
    submittedAt: now,
  };
  save({
    ...s,
    template_registry: { ...s.template_registry, [t.id]: entry },
    template_drafts: { ...s.template_drafts, [draft.id]: draft },
    template_versions: {
      ...s.template_versions,
      [key]: { key, templateId: t.id, version: t.version, config: t, createdAt: now },
    },
    template_reviews: { ...s.template_reviews, [review.id]: review },
  });
  if (currentUserId && isSupabaseConfigured()) {
    void submitHostedTemplate(t).catch((error) => {
      toast.error("Template review submission failed", {
        description:
          error instanceof Error ? error.message : "Check your connection and try again.",
      });
    });
  }
  return entry;
}

/** Loads account-owned drafts and the globally approved template catalog after sign-in. */
export function setTemplateAuthenticatedUser(userId: string | null) {
  if (currentUserId === userId) return;
  currentUserId = userId;
  state = null;
  listeners.forEach((listener) => listener());
  if (!userId || !isSupabaseConfigured()) return;

  void loadHostedTemplates()
    .then((hosted) => {
      if (currentUserId !== userId) return;
      const local = load();
      save({
        ...hosted,
        template_drafts: local.template_drafts,
        template_jobs: local.template_jobs,
        template_validation: local.template_validation,
      });
    })
    .catch((error) => {
      if (currentUserId !== userId) return;
      toast.error("Couldn't load saved templates", {
        description:
          error instanceof Error ? error.message : "Check your connection and refresh the page.",
      });
    });
}

export function getCollections(): TemplateCollections {
  return load();
}

/** Test helper: forget everything in memory and storage. */
export function resetTemplateStore() {
  state = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Re-renders when templates change, so posters pick up a newly saved template. */
export function useTemplateCollections(): TemplateCollections {
  return useSyncExternalStore(subscribe, load, () => SERVER);
}
