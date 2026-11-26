import type { CampaignStatus } from "@/lib/slag/types";
import { cn } from "@/lib/utils";

const STYLES: Record<CampaignStatus, string> = {
  draft: "bg-surface-container text-muted-foreground",
  active: "bg-lime text-lime-foreground",
  scheduled: "bg-tertiary-container/60 text-tertiary",
  expired: "bg-primary-fixed text-on-primary-container",
  archived: "bg-surface-dim text-muted-foreground",
};
const LABELS: Record<CampaignStatus, string> = { draft: "Draft", active: "Active", scheduled: "Scheduled", expired: "Expired", archived: "Archived" };

export function StatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase", STYLES[status], className)}>
      {status === "active" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-foreground" />}
      {LABELS[status]}
    </span>
  );
}
