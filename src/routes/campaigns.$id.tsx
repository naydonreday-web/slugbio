import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Download, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/slag/StatusBadge";
import { removeResponseLocal, useCampaign } from "@/lib/slag/store";
import { deriveStatus, formatDate, formatDateTime } from "@/lib/slag/publishing";
import { useAuthGuard } from "@/lib/supabase/use-auth";
import { deleteCampaignResponse } from "@/lib/supabase/data";

export const Route = createFileRoute("/campaigns/$id")({
  head: () => ({
    meta: [
      { title: "Campaign analytics — SlagBio" },
      { name: "description", content: "Views, button clicks and form responses for your campaign." },
      { property: "og:title", content: "Campaign analytics — SlagBio" },
      { property: "og:description", content: "Views, button clicks and form responses for your campaign." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Details,
});

function Details() {
  const auth = useAuthGuard();
  const { id } = Route.useParams();
  const { ready, campaign: c } = useCampaign(id);
  const [deletingResponseId, setDeletingResponseId] = useState<string | null>(null);
  if (auth.loading || !auth.user || !ready) return <Skeleton className="m-8 h-[80vh] rounded-3xl" />;
  if (!c) return <div className="p-10 text-center">Campaign not found. <Link to="/" className="text-primary-ink">Back to dashboard</Link></div>;
  const form = c.blocks.find((b) => b.type === "form");
  const labels = Object.fromEntries((form?.content.fields ?? []).map((f) => [f.id, f.label]));
  const keys = Array.from(new Set(c.responses.flatMap((r) => Object.keys(r.values))));
  const conv = c.views ? (((c.ctaClicks + c.responses.length) / c.views) * 100).toFixed(1) : "0";
  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [["Submitted", ...keys.map((k) => labels[k] ?? k)], ...c.responses.map((r) => [r.submittedAt, ...keys.map((k) => r.values[k] ?? "")])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" }));
    a.download = `${c.slug}-responses.csv`;
    a.click();
  };
  const removeResponse = async (responseId: string) => {
    if (!window.confirm("Permanently delete this response? This cannot be undone.")) return;
    setDeletingResponseId(responseId);
    try {
      await deleteCampaignResponse(c.id, responseId);
      removeResponseLocal(c.id, responseId);
      toast.success("Response deleted.");
    } catch {
      toast.error("Couldn't delete this response. Refresh and try again.");
    } finally {
      setDeletingResponseId(null);
    }
  };
  return (
    <div className="bg-ambient min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft /> Dashboard</Link></Button>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-headline-lg">{c.title}</h1>
          <StatusBadge status={deriveStatus(c)} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{c.startsAt ? `${formatDate(c.startsAt)} – ${formatDate(c.expiresAt)}` : "Not published yet"}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Views", c.views], ["Button clicks", c.ctaClicks], ["Form responses", c.responses.length], ["Conversion", `${conv}%`]].map(([l, v]) => (
            <div key={l} className="glass rounded-[10px] p-5"><div className="text-label-caps text-muted-foreground">{String(l).toUpperCase()}</div><div className="mt-2 text-3xl font-extrabold">{typeof v === "number" ? v.toLocaleString() : v}</div></div>
          ))}
        </div>
        <div className="glass mt-6 rounded-[10px] p-5">
          <div className="flex items-center justify-between"><h2 className="text-headline-md">Responses</h2><Button variant="glass" size="sm" onClick={exportCsv} disabled={!c.responses.length}><Download /> Export CSV</Button></div>
          {c.responses.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No responses yet. Form submissions from your live poster appear here.</p> : (
            <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-4">Submitted</th>{keys.map((k) => <th key={k} className="py-2 pr-4">{labels[k] ?? "Field"}</th>)}<th className="py-2 pl-4 text-right">Actions</th></tr></thead>
              <tbody>{c.responses.map((r) => <tr key={r.id} className="border-t border-glass-border"><td className="py-2 pr-4">{formatDateTime(r.submittedAt)}</td>{keys.map((k) => <td key={k} className="py-2 pr-4">{r.values[k]}</td>)}<td className="py-2 text-right"><Button variant="ghost" size="icon" aria-label="Delete response" title="Delete response" disabled={deletingResponseId === r.id} onClick={() => void removeResponse(r.id)}>{deletingResponseId === r.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></td></tr>)}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
