import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolTab = "ai" | "edit";

type Props = {
  /** Open tab, or null when the toolbar is collapsed. */
  open: ToolTab | null;
  onOpenChange: (tab: ToolTab | null) => void;
  editLabel: string;
  hasSelection: boolean;
  ai: ReactNode;
  edit: ReactNode;
};

/**
 * Bottom toolbar for the studio on phones and tablets. Collapsed it is a tab bar;
 * tapping a tab slides its panel up, tapping it again (or swiping the handle down) collapses it.
 */
export function MobileToolbar({ open, onOpenChange, editLabel, hasSelection, ai, edit }: Props) {
  const dragY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const toggle = (t: ToolTab) => onOpenChange(open === t ? null : t);
  const tabs: { id: ToolTab; label: string; icon: ReactNode; dot?: boolean }[] = [
    { id: "ai", label: "AI", icon: <Sparkles className="h-4 w-4" /> },
    { id: "edit", label: editLabel, icon: <SlidersHorizontal className="h-4 w-4" />, dot: hasSelection && open !== "edit" },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 lg:hidden">
      <div
        className={cn(
          "glass-strong pointer-events-auto mx-auto w-full max-w-2xl overflow-hidden rounded-t-3xl border-b-0 backdrop-blur-2xl transition-shadow",
          open && "shadow-float",
        )}
      >
        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} aria-hidden={!open}>
          <div className="min-h-0 overflow-hidden">
            <div
              className="relative flex cursor-grab touch-none items-center justify-between px-4 pt-2"
              onPointerDown={(e) => { dragY.current = e.clientY; }}
              onPointerUp={(e) => { if (dragY.current !== null && e.clientY - dragY.current > 40) onOpenChange(null); dragY.current = null; }}
              onPointerCancel={() => { dragY.current = null; }}
            >
              <span className="text-label-caps text-muted-foreground">{open === "ai" ? "AI ASSISTANT" : "PROPERTIES"}</span>
              <span className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-outline/40" />
              <button type="button" onClick={() => onOpenChange(null)} aria-label="Collapse toolbar" tabIndex={open ? 0 : -1} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-glass">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            {open === "ai" && <div className="h-[min(46dvh,420px)]">{ai}</div>}
            {open === "edit" && <div className="max-h-[min(46dvh,420px)] overflow-y-auto px-4 pt-1 pb-4">{edit}</div>}
          </div>
        </div>
        <div role="tablist" aria-label="Studio tools" className={cn("flex gap-1.5 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]", open && "border-t border-glass-border")}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={open === t.id}
              aria-expanded={open === t.id}
              onClick={() => toggle(t.id)}
              className={cn(
                "relative flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors",
                open === t.id ? "bg-foreground text-background" : t.id === "ai" ? "bg-primary text-primary-foreground" : "bg-surface-container hover:bg-surface-dim",
              )}
            >
              {t.icon}
              <span className="truncate">{t.label}</span>
              {t.dot && <span className="absolute top-2 right-4 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
