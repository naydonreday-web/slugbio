import type { Tables, TablesInsert } from "./database.types";
import { getSupabaseBrowserClient } from "./client";
import type {
  Campaign,
  FormResponse,
  Purpose,
  StoredStatus,
  Theme,
  Block,
  WizardAnswers,
  TemplateRef,
} from "@/lib/slag/types";
import type { Profile } from "@/lib/slag/profile";

type CampaignRow = Tables<"campaigns">;
type PublicCampaignRow = Pick<
  CampaignRow,
  | "id"
  | "slug"
  | "title"
  | "purpose"
  | "status"
  | "theme"
  | "template"
  | "blocks"
  | "starts_at"
  | "expires_at"
  | "expired_message"
  | "expired_contact"
>;

function asJson<T>(value: T): CampaignRow["theme"] {
  return value as CampaignRow["theme"];
}

function responseFromRow(row: Tables<"campaign_responses">): FormResponse {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    values: row.response_data as Record<string, string>,
  };
}

function campaignFromRow(row: CampaignRow, responses: FormResponse[] = []): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    purpose: row.purpose as Purpose,
    status: row.status as StoredStatus,
    visibility: row.visibility as Campaign["visibility"],
    theme: row.theme as unknown as Theme,
    template: (row.template as unknown as TemplateRef | null) ?? undefined,
    blocks: row.blocks as unknown as Block[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startsAt: row.starts_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    durationDays: row.duration_days ?? undefined,
    expiredMessage: row.expired_message ?? undefined,
    expiredContact: row.expired_contact ?? undefined,
    views: Number(row.views),
    ctaClicks: Number(row.cta_clicks),
    shares: Number(row.shares),
    daily: row.daily as unknown as Campaign["daily"],
    responses,
    payments: [],
    brief: (row.brief as unknown as WizardAnswers | null) ?? undefined,
  };
}

function campaignFromPublicRow(row: PublicCampaignRow): Campaign | undefined {
  if (!row.id || !row.slug || !row.title || !row.theme || !row.blocks) return;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    purpose: (row.purpose ?? "other") as Purpose,
    status: (row.status ?? "published") as StoredStatus,
    visibility: "private",
    theme: row.theme as unknown as Theme,
    template: (row.template as unknown as TemplateRef | null) ?? undefined,
    blocks: row.blocks as unknown as Block[],
    createdAt: row.starts_at ?? new Date(0).toISOString(),
    updatedAt: row.starts_at ?? new Date(0).toISOString(),
    startsAt: row.starts_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    expiredMessage: row.expired_message ?? undefined,
    expiredContact: row.expired_contact ?? undefined,
    views: 0,
    ctaClicks: 0,
    shares: 0,
    daily: {},
    responses: [],
    payments: [],
  };
}

function campaignInsert(campaign: Campaign, ownerId: string): TablesInsert<"campaigns"> {
  return {
    id: campaign.id,
    owner_id: ownerId,
    slug: campaign.slug,
    title: campaign.title,
    purpose: campaign.purpose,
    status: campaign.status,
    visibility: campaign.visibility,
    theme: asJson(campaign.theme),
    template: campaign.template ? asJson(campaign.template) : null,
    blocks: asJson(campaign.blocks),
    created_at: campaign.createdAt,
    updated_at: campaign.updatedAt,
    starts_at: campaign.startsAt ?? null,
    expires_at: campaign.expiresAt ?? null,
    duration_days: campaign.durationDays ?? null,
    expired_message: campaign.expiredMessage ?? null,
    expired_contact: campaign.expiredContact ?? null,
    brief: campaign.brief ? asJson(campaign.brief) : null,
  };
}

export interface AccountData {
  campaigns: Campaign[];
  profile?: Profile;
}

export async function loadAccountData(userId: string): Promise<AccountData> {
  const supabase = getSupabaseBrowserClient();
  const [campaignResult, profileResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
  ]);
  if (campaignResult.error) throw campaignResult.error;
  if (profileResult.error) throw profileResult.error;

  const ids = (campaignResult.data ?? []).map((campaign) => campaign.id);
  const responseResult = ids.length
    ? await supabase
        .from("campaign_responses")
        .select("*")
        .in("campaign_id", ids)
        .order("submitted_at", { ascending: false })
    : { data: [], error: null };
  if (responseResult.error) throw responseResult.error;

  const responseMap = new Map<string, FormResponse[]>();
  for (const row of responseResult.data ?? []) {
    const list = responseMap.get(row.campaign_id) ?? [];
    list.push(responseFromRow(row));
    responseMap.set(row.campaign_id, list);
  }

  const profileRow = profileResult.data;
  return {
    campaigns: (campaignResult.data ?? []).map((row) =>
      campaignFromRow(row, responseMap.get(row.id) ?? []),
    ),
    profile: profileRow
      ? {
          name: profileRow.name,
          phone: profileRow.phone ?? "",
          usage: profileRow.usage as unknown as Profile["usage"],
          completedAt: profileRow.completed_at ?? profileRow.updated_at,
        }
      : undefined,
  };
}

export async function saveCampaign(userId: string, campaign: Campaign): Promise<void> {
  const { error } = await getSupabaseBrowserClient()
    .from("campaigns")
    .upsert(campaignInsert(campaign, userId));
  if (error) throw error;
}

export async function removeCampaign(id: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

export async function saveProfile(userId: string, profile: Profile): Promise<void> {
  const { error } = await getSupabaseBrowserClient()
    .from("profiles")
    .upsert({
      id: userId,
      name: profile.name,
      phone: profile.phone || null,
      usage: asJson(profile.usage),
      completed_at: profile.completedAt,
    });
  if (error) throw error;
}

export async function deleteCampaignResponse(
  campaignId: string,
  responseId: string,
): Promise<void> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("campaign_responses")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("id", responseId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Response not found or not owned by this account.");
}

export async function trackCampaignMetric(
  campaignId: string,
  metric: "view" | "click" | "share",
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().functions.invoke("campaign-public", {
    body: { action: "track", campaignId, metric },
  });
  if (error) throw error;
}

export async function loadPublicCampaign(slug: string): Promise<Campaign | undefined> {
  const { data, error } = await getSupabaseBrowserClient().functions.invoke("campaign-public", {
    body: { action: "load", slug },
  });
  if (error) throw error;
  return data ? campaignFromPublicRow(data as PublicCampaignRow) : undefined;
}

export async function isCampaignSlugAvailable(slug: string, campaignId: string): Promise<boolean> {
  const { data, error } = await getSupabaseBrowserClient().rpc("is_campaign_slug_available", {
    p_slug: slug,
    p_campaign_id: campaignId,
  });
  if (error) throw error;
  return data === true;
}
