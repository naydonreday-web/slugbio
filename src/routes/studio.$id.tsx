import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Eye, Redo2, Undo2, Smartphone, Tablet, Monitor } from "lucide-react";
import { PosterRenderer } from "@/components/slag/poster/PosterRenderer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AssistantPanel } from "@/components/slag/studio/AssistantPanel";
import { Inspector } from "@/components/slag/studio/Inspector";
import { MobileToolbar, type ToolTab } from "@/components/slag/studio/MobileToolbar";
import { interpret, interpretElement } from "@/lib/slag/assistant";
import { elementMeta, setElementStyle } from "@/lib/slag/elements";
import { BLOCK_META, uid } from "@/lib/slag/blocks";
import { replaceCampaign, useCampaign } from "@/lib/slag/store";
import type { Block, BlockContent, Campaign, ChatMessage, ElementKey, ElementStyle } from "@/lib/slag/types";
import { cn } from "@/lib/utils";
import { useAuthGuard } from "@/lib/supabase/use-auth";

export const Route = createFileRoute("/studio/$id")({
  validateSearch: (s: Record<string, unknown>): { fresh?: boolean } => (s.fresh ? { fresh: true } : {}),
  head: () => ({
    meta: [
      { title: "Campaign Studio — SlugBio" },
      { name: "description", content: "Edit your campaign poster with AI or directly, with a live preview." },
      { property: "og:title", content: "Campaign Studio — SlugBio" },
      { property: "og:description", content: "Edit your campaign poster with AI or directly, with a live preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

const DEVICES = { mobile: 390, tablet: 768, desktop: 1100 } as const;

function Studio() {
  const auth = useAuthGuard();
  const { id } = Route.useParams();
  const { ready, campaign } = useCampaign(id);
  if (auth.loading || !auth.user || !ready) return <Skeleton className="m-8 h-[80vh] rounded-3xl" />;
  if (!campaign) return <div className="p-10 text-center">Campaign not found. <Link to="/" className="text-primary-ink">Back to dashboard</Link></div>;
  return <Editor initial={campaign} />;
}

function Editor({ initial }: { initial: Campaign }) {
  const [doc, setDoc] = useState(initial);
  const lastSavedDoc = useRef(initial);
  const latestDoc = useRef(doc);
  const pendingSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [past, setPast] = useState<Campaign[]>([]);
  const [future, setFuture] = useState<Campaign[]>([]);
  const [sel, setSelBlock] = useState<string | null>(null);
  const [el, setEl] = useState<ElementKey | null>(null);
  /** Selecting a block (or nothing) clears the element inside it. */
  const setSel = (id: string | null) => { setSelBlock(id); setEl(null); };
  const selectElement = (bid: string, key: ElementKey | null) => { setSelBlock(bid); setEl(key); };
  const [device, setDevice] = useState<keyof typeof DEVICES>("mobile");
  const [saved, setSaved] = useState(true);
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ id: "w", role: "assistant", text: "Your poster is ready. Tell me what to change, or click any block to edit it directly.", at: "" }]);
  const [input, setInput] = useState("");
  const [tool, setTool] = useState<ToolTab | null>(null);
  const [aiFocus, setAiFocus] = useState(0);
  const lastKey = useRef<{ k: string; t: number } | null>(null);

  latestDoc.current = doc;

  useEffect(() => {
    if (doc === lastSavedDoc.current) {
      setSaved(true);
      return;
    }
    setSaved(false);
    const t = setTimeout(() => {
      pendingSaveTimer.current = null;
      lastSavedDoc.current = doc;
      replaceCampaign(doc);
      setSaved(true);
    }, 500);
    pendingSaveTimer.current = t;
    return () => clearTimeout(t);
  }, [doc]);

  useEffect(
    () => () => {
      if (pendingSaveTimer.current !== null) {
        clearTimeout(pendingSaveTimer.current);
        pendingSaveTimer.current = null;
        if (latestDoc.current !== lastSavedDoc.current) {
          lastSavedDoc.current = latestDoc.current;
          replaceCampaign(latestDoc.current);
        }
      }
    },
    [],
  );

  const apply = (next: Campaign, key?: string) => {
    const now = Date.now();
    const coalesce = key && lastKey.current?.k === key && now - lastKey.current.t < 1500;
    if (!coalesce) setPast((p) => [...p, doc]);
    lastKey.current = key ? { k: key, t: now } : null;
    setFuture([]);
    setDoc(next);
  };
  const undo = () => { const p = past.at(-1); if (!p) return; setFuture((f) => [doc, ...f]); setPast(past.slice(0, -1)); setDoc(p); };
  const redo = () => { const f = future[0]; if (!f) return; setPast((p) => [...p, doc]); setFuture(future.slice(1)); setDoc(f); };

  const editBlock = (bid: string, patch: Partial<BlockContent>, key?: string) =>
    apply({ ...doc, blocks: doc.blocks.map((b) => (b.id === bid ? { ...b, content: { ...b.content, ...patch } } : b)) }, key ?? `${bid}:${Object.keys(patch).join()}`);
  const styleBlock = (bid: string, patch: Partial<Block["style"]>) =>
    apply({ ...doc, blocks: doc.blocks.map((b) => (b.id === bid ? { ...b, style: { ...b.style, ...patch } } : b)) }, `${bid}:style:${Object.keys(patch).join()}`);
  const styleElement = (bid: string, key: ElementKey, patch: Partial<ElementStyle>) =>
    apply({ ...doc, blocks: doc.blocks.map((b) => (b.id === bid ? setElementStyle(b, key, patch) : b)) }, `${bid}:${key}:fmt:${Object.keys(patch).join()}`);

  const send = (text: string) => {
    if (!text.trim()) return;
    const user: ChatMessage = { id: uid("m"), role: "user", text, at: new Date().toISOString() };
    const r = (sel && el ? interpretElement(text, doc, sel, el) : null) ?? interpret(text, doc, sel);
    if (r.command === "undo") undo();
    if (r.command === "redo") redo();
    if (r.campaign) apply(r.campaign);
    if (r.selectId !== undefined && r.selectId !== sel) setSel(r.selectId);
    setMsgs((m) => [...m, user, { id: uid("m"), role: "assistant", text: r.reply, changes: r.changes, at: new Date().toISOString() }]);
    setInput("");
  };

  const selected = doc.blocks.find((b) => b.id === sel) ?? null;
  const elMeta = selected ? elementMeta(selected.type, el) : null;
  const pickElement = (key: ElementKey | null) => { if (sel) selectElement(sel, key); };
  const reveal = (id: string, sheetOpen: boolean) =>
    // With the bottom sheet up only the top of the canvas is visible, so align the block to the top.
    document.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: sheetOpen ? "start" : "center" });
  const pick = (id: string) => {
    setSel(id);
    reveal(id, !!tool);
  };
  const askAi = () => {
    setAiFocus((n) => n + 1);
    if (!window.matchMedia("(min-width: 1024px)").matches) setTool("ai");
  };
  // Opening the sheet on a phone covers the lower half of the canvas: bring the selected block above it.
  useEffect(() => {
    if (tool && sel) reveal(sel, true);
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = () => { if (!selected) return; apply({ ...doc, blocks: doc.blocks.filter((b) => b.id !== selected.id) }); setSel(null); };
  const move = (dir: -1 | 1) => {
    if (!selected) return;
    const i = doc.blocks.indexOf(selected); const j = i + dir;
    if (j < 0 || j >= doc.blocks.length) return;
    const blocks = [...doc.blocks]; [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    apply({ ...doc, blocks });
  };

  return (
    <div className="flex h-dvh flex-col bg-surface-container-low">
      <header className="glass z-10 flex h-16 shrink-0 items-center gap-2 border-x-0 border-t-0 px-3 md:px-5">
        <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Back to dashboard"><ArrowLeft /></Link></Button>
        <input value={doc.title} onChange={(e) => apply({ ...doc, title: e.target.value }, "title")} className="min-w-0 flex-1 rounded-full bg-transparent px-2 text-[15px] font-bold outline-none focus:bg-glass-strong md:max-w-xs" aria-label="Campaign title" />
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">{saved ? <><Check className="h-3.5 w-3.5 text-success" /> Saved</> : "Saving…"}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={undo} disabled={!past.length} aria-label="Undo"><Undo2 /></Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 /></Button>
          <div className="mx-1 hidden rounded-full border border-glass-border bg-glass p-1 md:flex">
            {(["mobile", "tablet", "desktop"] as const).map((d) => {
              const I = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
              return <button key={d} onClick={() => setDevice(d)} aria-label={d} className={cn("rounded-full p-1.5", device === d && "bg-background shadow-pill")}><I className="h-4 w-4" /></button>;
            })}
          </div>
          <Button asChild variant="glass" size="sm" className="h-9"><Link to="/preview/$id" params={{ id: doc.id }}><Eye /> <span className="hidden sm:inline">Preview</span></Link></Button>
          <Button asChild size="sm" className="h-9"><Link to="/publish/$id" params={{ id: doc.id }}>Publish</Link></Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,280px)]">
        <aside className="hidden min-h-0 flex-col border-r border-glass-border bg-background/50 lg:flex" aria-label="AI assistant">
          <PanelTitle>AI assistant</PanelTitle>
          <AssistantPanel msgs={msgs} input={input} setInput={setInput} send={send} selected={selected} elementLabel={elMeta?.label} wrapChips onClearSelection={() => setSel(null)} focusSignal={aiFocus} />
        </aside>
        <main
          className={cn("bg-dots min-h-0 flex-1 overflow-auto scroll-smooth p-3 sm:p-4 md:p-8 lg:pb-10", tool ? "pb-[calc(min(46dvh,420px)+6rem)] md:pb-[calc(min(46dvh,420px)+6rem)]" : "pb-28 md:pb-28")}
          onClick={() => setSel(null)}
        >
          <div className="mx-auto overflow-hidden rounded-[22px] shadow-float ring-1 ring-foreground/5 md:rounded-[28px]" style={{ width: "100%", maxWidth: DEVICES[device] }}>
            <PosterRenderer campaign={doc} mode="edit" selectedId={sel} selectedElement={el} onSelect={setSel} onSelectElement={selectElement} onEdit={(bid, p) => editBlock(bid, p)} />
          </div>
        </main>
        <aside className="hidden min-h-0 flex-col border-l border-glass-border bg-background/50 lg:flex" aria-label="Block properties">
          <PanelTitle>{selected ? "Properties" : "Blocks"}</PanelTitle>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-1">
            <Inspector doc={doc} selected={selected} element={elMeta?.key ?? null} onPick={pick} onPickElement={pickElement} onClear={() => setSel(null)} editBlock={editBlock} styleBlock={styleBlock} styleElement={styleElement} move={move} remove={remove} onAskAi={askAi} />
          </div>
        </aside>
      </div>
      <MobileToolbar
        open={tool}
        onOpenChange={setTool}
        editLabel={selected ? `Edit ${elMeta?.label ?? BLOCK_META[selected.type].label}` : "Edit"}
        hasSelection={!!selected}
        ai={<AssistantPanel msgs={msgs} input={input} setInput={setInput} send={send} selected={selected} elementLabel={elMeta?.label} onClearSelection={() => setSel(null)} focusSignal={aiFocus} />}
        edit={<Inspector doc={doc} selected={selected} element={elMeta?.key ?? null} onPick={pick} onPickElement={pickElement} onClear={() => setSel(null)} editBlock={editBlock} styleBlock={styleBlock} styleElement={styleElement} move={move} remove={remove} onAskAi={askAi} />}
      />
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0 px-4 pt-4 pb-2 text-label-caps text-muted-foreground uppercase">{children}</div>;
}
