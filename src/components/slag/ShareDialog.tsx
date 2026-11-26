import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download, ExternalLink, MessageCircle, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { recordShare } from "@/lib/slag/store";
import { deriveStatus, formatDate, publicPath } from "@/lib/slag/publishing";
import type { Campaign } from "@/lib/slag/types";

export function liveUrl(slug: string) {
  if (typeof window === "undefined") return publicPath(slug);
  return new URL(publicPath(slug), window.location.origin).toString();
}

export function ShareDialog({ campaign, open, onOpenChange, celebrate }: { campaign: Campaign; open: boolean; onOpenChange: (o: boolean) => void; celebrate?: boolean }) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const status = deriveStatus(campaign);
  const url = liveUrl(campaign.slug);
  const published = status === "active" || status === "scheduled";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      recordShare(campaign.id);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  };
  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${campaign.slug}-qr.png`;
    a.click();
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(`${campaign.title} — ${url}`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md rounded-3xl border-glass-border p-0 sm:rounded-3xl">
        <div className="flex flex-col gap-5 p-7">
          {celebrate && (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lime text-lime-foreground">
              <PartyPopper className="h-7 w-7" />
            </span>
          )}
          <div>
            <DialogTitle className="text-headline-md">
              {celebrate ? (status === "scheduled" ? "Your campaign is scheduled" : "Your campaign is live!") : "Share campaign"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-muted-foreground">
              {!published
                ? "Publish this campaign to get a shareable link."
                : status === "scheduled"
                  ? `It goes live on ${formatDate(campaign.startsAt)} and runs until ${formatDate(campaign.expiresAt)}.`
                  : `Live until ${formatDate(campaign.expiresAt)}. ${campaign.visibility === "public" ? "Listed in public discovery." : "Private — only people with the link can see it."}`}
            </DialogDescription>
          </div>

          {published ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-glass-border bg-glass p-1.5 pl-4">
                <span className="min-w-0 flex-1 truncate text-sm font-medium" title={url}>{url.replace(/^https?:\/\//, "")}</span>
                <Button size="sm" className="rounded-full" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-glass-border bg-glass p-4">
                <div ref={qrRef} className="rounded-xl bg-background p-2">
                  <QRCodeCanvas value={url} size={112} marginSize={0} />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-semibold">QR code</div>
                  <p className="text-xs text-muted-foreground">Print it on flyers or show it at your counter.</p>
                  <Button variant="outline" size="sm" className="w-fit rounded-full bg-glass" onClick={downloadQr}>
                    <Download className="h-4 w-4" /> Download PNG
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="rounded-full bg-glass">
                  <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => recordShare(campaign.id)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-glass">
                  <a href={publicPath(campaign.slug)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> View live
                  </a>
                </Button>
              </div>
              {celebrate && (
                <Button asChild variant="ghost" className="rounded-full">
                  <Link to="/">Return to dashboard</Link>
                </Button>
              )}
            </>
          ) : (
            <Button asChild className="rounded-full">
              <Link to="/publish/$id" params={{ id: campaign.id }}>Continue to publishing</Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
