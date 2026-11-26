import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChoiceCard({ selected, onClick, title, hint, icon, className }: { selected: boolean; onClick: () => void; title: string; hint?: string; icon?: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
        selected ? "border-primary bg-primary/8 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]" : "border-glass-border bg-glass hover:bg-glass-strong",
        className,
      )}
    >
      {icon && <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", selected ? "bg-primary text-primary-foreground" : "bg-surface-container text-foreground")}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{title}</span>
        {hint && <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>}
      </span>
      {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
    </button>
  );
}

export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition-colors", selected ? "border-foreground bg-foreground text-background" : "border-glass-border bg-glass hover:bg-glass-strong")}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, optional }: { label: string; hint?: string; error?: string; children: ReactNode; optional?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">
        {label} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </span>
      {children}
      {error ? <span className="text-xs font-semibold text-destructive">{error}</span> : hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-input bg-background/70 px-4 py-3 text-[15px] outline-none transition-shadow placeholder:text-outline focus:border-primary focus:ring-[3px] focus:ring-primary/15";
