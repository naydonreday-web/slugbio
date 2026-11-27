import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Copy, Eye, MoreHorizontal, Pencil, RefreshCw, Share2, Archive, Trash2, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PosterThumb } from "./PosterThumb";
import { StatusBadge } from "./StatusBadge";
import { ShareDialog } from "./ShareDialog";
import { archiveCampaign, deleteCampaign, duplicateCampaign } from "@/lib/slag/store";
import { daysLeft, deriveStatus, formatDate } from "@/lib/slag/publishing";
import type { Campaign } from "@/lib/slag/types";

function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function campaignMeta(c: Campaign): string {
  const s = deriveStatus(c);
  if (s === "draft") return `Draft · edited ${timeAgo(c.updatedAt)}`;
  if (s === "scheduled") return `Starts ${formatDate(c.startsAt)}`;
  if (s === "active") {
    const d = daysLeft(c.expiresAt) ?? 0;
    return d <= 1 ? "Ends today" : `Ends ${formatDate(c.expiresAt)} · ${d} days left`;
  }
  if (s === "expired") return `Ended ${formatDate(c.expiresAt)}`;
  return "Archived";
}

export function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const status = deriveStatus(c);
  const [share, setShare] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();

  const action = (label: string, icon: React.ReactNode, el: React.ReactElement) => (
    <Tooltip>
      <TooltipTrigger asChild>{el}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
  const iconBtn = "h-9 w-9 rounded-full";

  return (
    <article className="glass group flex flex-col overflow-hidden rounded-[10px] transition-shadow hover:shadow-float">
      <Link to="/studio/$id" params={{ id: c.id }} className="relative block" aria-label={`Edit ${c.title}`}>
        <PosterThumb campaign={c} className="aspect-[4/5] w-full" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <StatusBadge status={status} className="shadow-pill" />
        </div>
        <div className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/5" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-bold tracking-tight">{c.title}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{campaignMeta(c)}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {c.views.toLocaleString()} views</span>
          <span>{c.responses.length} past responses</span>
        </div>
        <div className="mt-auto flex items-center gap-1.5 border-t border-glass-border pt-3">
          <Button asChild size="sm" className="h-9 rounded-full px-4">
            <Link to="/studio/$id" params={{ id: c.id }}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
          </Button>
          {action("Preview", null, <Button asChild variant="ghost" size="icon" className={iconBtn}><Link to="/preview/$id" params={{ id: c.id }} aria-label="Preview"><Eye /></Link></Button>)}
          {action("Share", null, <Button variant="ghost" size="icon" className={iconBtn} onClick={() => setShare(true)} aria-label="Share"><Share2 /></Button>)}
          {action("View analytics", null, <Button asChild variant="ghost" size="icon" className={iconBtn}><Link to="/campaigns/$id" params={{ id: c.id }} aria-label="View analytics"><BarChart3 /></Link></Button>)}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={`${iconBtn} ml-auto`} aria-label="More actions"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              {(status === "expired" || status === "active") && (
                <DropdownMenuItem onClick={() => navigate({ to: "/publish/$id", params: { id: c.id } })}><RefreshCw /> {status === "expired" ? "Renew" : "Extend"}</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { const d = duplicateCampaign(c.id); if (d) toast.success("Duplicated as a new draft"); }}><Copy /> Duplicate</DropdownMenuItem>
              {status === "archived" ? (
                <DropdownMenuItem onClick={() => { archiveCampaign(c.id, false); toast.success("Restored"); }}><ArchiveRestore /> Restore</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => { archiveCampaign(c.id, true); toast.success("Archived — find it under Archived"); }}><Archive /> Archive</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirm(true)}><Trash2 /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ShareDialog campaign={c} open={share} onOpenChange={setShare} />
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogTitle>Delete “{c.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {status === "active" ? "This campaign is live. Deleting it takes the link offline immediately and removes its responses." : "This removes the poster and its responses. This can't be undone."}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-destructive hover:bg-destructive/90" onClick={() => { deleteCampaign(c.id); toast.success("Campaign deleted"); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
