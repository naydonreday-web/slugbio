import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner";
import { PosterRenderer, ctaHref } from "@/components/slag/poster/PosterRenderer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign } from "@/lib/slag/store";
import { cn } from "@/lib/utils";
import { useAuthGuard } from "@/lib/supabase/use-auth";

export const Route = createFileRoute("/preview/$id")({
  head: () => ({
    meta: [
      { title: "Preview — SlagBio" },
      { name: "description", content: "Test your campaign poster's buttons and forms before publishing." },
      { property: "og:title", content: "Preview — SlagBio" },
      { property: "og:description", content: "Test your campaign poster's buttons and forms before publishing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Preview,
});

function Preview() {
  const auth = useAuthGuard();
  const { id } = Route.useParams();
  const { ready, campaign } = useCampaign(id);
  const [wide, setWide] = useState(false);
  if (auth.loading || !auth.user || !ready) return <Skeleton className="m-8 h-[80vh] rounded-3xl" />;
  if (!campaign) return <div className="p-10 text-center">Campaign not found. <Link to="/" className="text-primary-ink">Back to dashboard</Link></div>;
  return (
    <div className="min-h-dvh bg-dots bg-surface-container-low">
      <header className="glass sticky top-0 z-10 flex items-center gap-2 border-x-0 border-t-0 px-4 py-3">
        <Button asChild variant="ghost" size="sm"><Link to="/studio/$id" params={{ id }}><ArrowLeft /> Edit</Link></Button>
        <span className="hidden truncate text-sm font-bold sm:block">{campaign.title}</span>
        <div className="mx-auto flex rounded-full border border-glass-border bg-glass p-1">
          <button onClick={() => setWide(false)} className={cn("rounded-full p-1.5", !wide && "bg-background shadow-pill")} aria-label="Mobile"><Smartphone className="h-4 w-4" /></button>
          <button onClick={() => setWide(true)} className={cn("rounded-full p-1.5", wide && "bg-background shadow-pill")} aria-label="Desktop"><Monitor className="h-4 w-4" /></button>
        </div>
        <Button asChild size="sm"><Link to="/publish/$id" params={{ id }}>Continue to publishing</Link></Button>
      </header>
      <p className="py-3 text-center text-xs text-muted-foreground">Test mode — buttons work, form responses aren't saved.</p>
      <div className="mx-auto overflow-hidden rounded-[28px] shadow-float" style={{ maxWidth: wide ? 1100 : 390 }}>
        <PosterRenderer campaign={campaign} mode="preview" onCtaClick={(b) => { if (b.content.action !== "form" && !ctaHref(b)) toast("This button has no destination yet", { description: "Add one in the editor." }); }} />
      </div>
    </div>
  );
}
