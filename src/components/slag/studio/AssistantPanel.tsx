import { useEffect, useRef } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { QUICK_SUGGESTIONS } from "@/lib/slag/assistant";
import { BLOCK_META } from "@/lib/slag/blocks";
import type { Block, ChatMessage } from "@/lib/slag/types";
import { cn } from "@/lib/utils";

type Props = {
  msgs: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  send: (text: string) => void;
  selected: Block | null;
  /** Label of the selected element inside the block (e.g. "Headline"), when one is picked. */
  elementLabel?: string | null;
  /** Wrap suggestion chips instead of scrolling them sideways. */
  wrapChips?: boolean;
  /** Stop scoping requests to the selected block. */
  onClearSelection?: () => void;
  /** Changing this number focuses the message box (e.g. from the inspector's "Ask AI"). */
  focusSignal?: number;
};

/** AI conversation, quick suggestions and composer — shared by the desktop panel and the mobile toolbar. */
export function AssistantPanel({ msgs, input, setInput, send, selected, elementLabel, wrapChips, onClearSelection, focusSignal }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusSignal) inputRef.current?.focus({ preventScroll: true });
  }, [focusSignal]);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m) => (
          <div key={m.id} className={cn("rounded-2xl border p-3 text-sm", m.role === "user" ? "ml-6 rounded-tr-none border-primary/20 bg-primary/10" : "mr-4 rounded-tl-none border-glass-border bg-glass-strong")}>
            {m.role === "assistant" && <Sparkles className="mb-1 h-3.5 w-3.5 text-primary" />}
            {m.text}
            {m.changes?.length ? <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">{m.changes.map((c) => <li key={c}>{c}</li>)}</ul> : null}
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-glass-border p-3">
        {selected && (
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Changes apply to</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed py-0.5 pr-1 pl-2.5 font-bold text-on-primary-container">
              {BLOCK_META[selected.type].label}{elementLabel && <> › {elementLabel}</>}
              {onClearSelection && (
                <button type="button" onClick={onClearSelection} aria-label="Apply changes to the whole poster" className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-background/60">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          </div>
        )}
        <div className={cn("scrollbar-none mb-2 flex gap-1.5 overflow-x-auto", wrapChips && "flex-wrap")}>
          {QUICK_SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="shrink-0 rounded-full border border-glass-border bg-glass px-3 py-1 text-xs font-semibold hover:bg-glass-strong">
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 rounded-full border border-glass-border bg-glass-strong p-1.5 pl-4">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selected ? `Change the ${(elementLabel ?? BLOCK_META[selected.type].label).toLowerCase()}…` : "Ask AI to change anything…"}
            aria-label="Message the AI assistant"
            className="min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
          />
          <button type="submit" aria-label="Send" disabled={!input.trim()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
