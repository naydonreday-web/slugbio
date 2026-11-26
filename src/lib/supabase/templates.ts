import type { Tables } from "./database.types";
import type { TemplateConfig } from "@/lib/slag/templates/schema";
import { validateTemplate } from "@/lib/slag/templates/schema";
import type {
  ReviewEntry,
  TemplateCollections,
  RegistryEntry,
  VersionEntry,
} from "@/lib/slag/templates/store";
import { versionKey } from "@/lib/slag/templates/store";
import { getSupabaseBrowserClient } from "./client";

type RegistryRow = Tables<"template_registry">;
type VersionRow = Tables<"template_versions">;
type ReviewRow = Tables<"template_reviews">;

function asRegistry(row: RegistryRow): RegistryEntry {
  return {
    id: row.id,
    name: row.name,
    source: row.source as RegistryEntry["source"],
    status: row.status as RegistryEntry["status"],
    currentVersion: row.current_version,
    publishedVersion: row.published_version ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

function asVersion(row: VersionRow): VersionEntry | undefined {
  const check = validateTemplate(row.config);
  if (
    !check.template ||
    check.template.id !== row.template_id ||
    check.template.version !== row.version
  )
    return undefined;
  return {
    key: versionKey(row.template_id, row.version),
    templateId: row.template_id,
    version: row.version,
    config: check.template,
    createdAt: row.created_at,
  };
}

function asReview(row: ReviewRow): ReviewEntry {
  return {
    id: row.id,
    templateId: row.template_id,
    version: row.version,
    status: row.status as ReviewEntry["status"],
    submittedAt: row.submitted_at,
    note: row.note ?? undefined,
  };
}

export async function loadHostedTemplates(): Promise<TemplateCollections> {
  const supabase = getSupabaseBrowserClient();
  const [registryResult, versionsResult, reviewsResult] = await Promise.all([
    supabase.from("template_registry").select("*").order("updated_at", { ascending: false }),
    supabase.from("template_versions").select("*"),
    supabase.from("template_reviews").select("*"),
  ]);
  if (registryResult.error) throw registryResult.error;
  if (versionsResult.error) throw versionsResult.error;
  if (reviewsResult.error) throw reviewsResult.error;

  const template_registry: TemplateCollections["template_registry"] = {};
  for (const row of registryResult.data ?? []) template_registry[row.id] = asRegistry(row);
  const template_versions: TemplateCollections["template_versions"] = {};
  for (const row of versionsResult.data ?? []) {
    const version = asVersion(row);
    if (version) template_versions[version.key] = version;
  }
  const template_reviews: TemplateCollections["template_reviews"] = {};
  for (const row of reviewsResult.data ?? []) template_reviews[row.id] = asReview(row);

  return {
    template_registry,
    template_versions,
    template_reviews,
    template_drafts: {},
    template_jobs: {},
    template_validation: {},
    block_registry: (await import("@/lib/slag/templates/registry")).blockRegistrySnapshot(),
  };
}

export async function submitHostedTemplate(config: TemplateConfig): Promise<void> {
  const check = validateTemplate(config);
  if (!check.template) throw new Error("Template failed validation before submission.");
  const { error } = await getSupabaseBrowserClient().rpc("submit_template_for_review", {
    p_config: check.template as unknown as import("./database.types").Json,
  });
  if (error) throw error;
}

export interface PendingTemplateReview {
  templateId: string;
  version: string;
  name: string;
  source: string;
  createdBy: string;
  submittedAt: string;
  config: TemplateConfig;
}

export async function loadPendingTemplateReviews(): Promise<PendingTemplateReview[]> {
  const supabase = getSupabaseBrowserClient();
  const { data: registry, error: registryError } = await supabase
    .from("template_registry")
    .select("id,name,source,current_version,created_by,updated_at")
    .eq("status", "pending_review")
    .order("updated_at", { ascending: true });
  if (registryError) throw registryError;
  if (!registry?.length) return [];

  const ids = registry.map((row) => row.id);
  const [versionsResult, reviewsResult] = await Promise.all([
    supabase.from("template_versions").select("*").in("template_id", ids),
    supabase
      .from("template_reviews")
      .select("template_id,version,submitted_at")
      .in("template_id", ids)
      .eq("status", "pending"),
  ]);
  if (versionsResult.error) throw versionsResult.error;
  if (reviewsResult.error) throw reviewsResult.error;

  const versions = new Map(
    (versionsResult.data ?? []).map((row) => [`${row.template_id}@${row.version}`, asVersion(row)]),
  );
  const reviews = new Map(
    (reviewsResult.data ?? []).map((row) => [
      `${row.template_id}@${row.version}`,
      row.submitted_at,
    ]),
  );
  return registry.flatMap((row) => {
    const key = `${row.id}@${row.current_version}`;
    const version = versions.get(key);
    const submittedAt = reviews.get(key);
    if (!version || !submittedAt) return [];
    return [
      {
        templateId: row.id,
        version: row.current_version,
        name: row.name,
        source: row.source,
        createdBy: row.created_by,
        submittedAt,
        config: version.config,
      },
    ];
  });
}

export async function reviewHostedTemplate(
  templateId: string,
  version: string,
  decision: "approved" | "rejected",
  note?: string,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("review_template", {
    p_template_id: templateId,
    p_version: version,
    p_decision: decision,
    p_note: note ?? undefined,
  });
  if (error) throw error;
}

export async function getHostedTemplateVersion(
  templateId: string,
  version: string,
): Promise<TemplateConfig | undefined> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("template_versions")
    .select("config")
    .eq("template_id", templateId)
    .eq("version", version)
    .maybeSingle();
  if (error) throw error;
  return data ? validateTemplate(data.config).template : undefined;
}
