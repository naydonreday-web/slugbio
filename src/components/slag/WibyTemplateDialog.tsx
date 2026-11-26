import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterThumb } from "@/components/slag/PosterThumb";
import { generateCampaign, inferPurpose, inferTitle } from "@/lib/slag/generate";
import type { TemplateConfig, ValidationCheck } from "@/lib/slag/templates/schema";
import { runWibyTemplateJob } from "@/lib/slag/templates/wiby";
import type { WizardAnswers } from "@/lib/slag/types";
import { cn } from "@/lib/utils";

const STAGES = ["Reading your idea", "Choosing colours and type", "Laying out your blocks", "Checking it's easy to read"];
const STAGE_MS = 650;

/** Sample poster built from the wizard answers so far, so a template is previewed with the user's own content. */
export function samplePoster(a: WizardAnswers, template: TemplateConfig) {
  const title = a.title.trim() || (a.prompt ? inferTitle(a.prompt) : "") || "Your campaign";
  return generateCampaign({ ...a, title, purpose: a.purpose ?? (a.prompt ? inferPurpose(a.prompt) : undefined), themeId: undefined, templateRef: undefined }, template);
}

type State = { stage: number; template?: TemplateConfig; checks?: ValidationCheck[]; failed?: boolean };

export function WibyTemplateDialog({ open, onOpenChange, answers, onUse }: { open: boolean; onOpenChange: (o: boolean) => void; answers: WizardAnswers; onUse: (t: TemplateConfig) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ stage: 0 });
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!open) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setState({ stage: 0 });
    let result: ReturnType<typeof runWibyTemplateJob> | null = null;
    try {
      result = runWibyTemplateJob({ prompt: answers.prompt, title: answers.title, purpose: answers.purpose, tone: answers.tone }, attempt);
    } catch {
      result = null;
    }
    STAGES.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setState((s) => ({ ...s, stage: i + 1 })), STAGE_MS * (i + 1)));
    });
    timers.current.push(
      window.setTimeout(() => setState({ stage: STAGES.length, template: result?.template, checks: result?.validation.checks, failed: !result?.template }), STAGE_MS * STAGES.length + 200),
    );
    return () => timers.current.forEach(clearTimeout);
  }, [open, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => (state.template ? samplePoster(answers, state.template) : null), [state.template]); // eslint-disable-line react-hooks/exhaustive-deps
  const working = !state.template && !state.failed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong grid max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-[820px] gap-0 overflow-y-auto rounded-3xl border-glass-border p-0 sm:rounded-3xl md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col p-6 md:p-8">
          <span className="text-label-caps text-muted-foreground">{working ? "WIBY · NEW TEMPLATE" : state.failed ? "WIBY" : "NEW TEMPLATE"}</span>
          <DialogTitle className="mt-3 text-[26px] leading-tight font-bold tracking-tight md:text-headline-md">
            {working ? "Wiby is designing a template…" : state.failed ? "That design didn't pass" : state.template!.name}
          </DialogTitle>
          <DialogDescription className="mt-2 text-[15px] text-muted-foreground">
            {working ? "A fresh look made for your campaign. Your words and details stay exactly as you write them." : state.failed ? "Wiby checks every design is easy to read before you can use it. Let it try again." : state.template!.description}
          </DialogDescription>

          {working ? (
            <>
              <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500" style={{ width: `${(state.stage / STAGES.length) * 100}%` }} />
              </div>
              <ol className="mt-6 flex flex-col gap-3.5">
                {STAGES.map((s, i) => {
                  const done = state.stage > i;
                  const active = state.stage === i;
                  return (
                    <li key={s} className={cn("flex items-center gap-3 text-[15px] transition-opacity", !done && !active && "opacity-45")}>
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border", done ? "border-lime bg-lime text-lime-foreground" : "border-glass-border bg-glass")}>
                        {done ? <Check className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </span>
                      <span className={cn(active && "font-semibold")}>{s}</span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-8">
                <Button variant="ghost" onClick={() => onOpenChange(false)}><X /> Cancel</Button>
              </div>
            </>
          ) : (
            <>
              {state.template && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {state.template.tags.map((t) => <span key={t} className="rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-lime-foreground">{t}</span>)}
                </div>
              )}
              <ul className="mt-5 flex flex-col gap-2">
                {(state.checks ?? []).map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5 text-sm">
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", c.ok ? "bg-lime text-lime-foreground" : "bg-destructive text-destructive-foreground")}>
                      {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
              {state.template && (
                <div className="mt-5 rounded-xl bg-surface-container/60 p-3 text-sm">
                  <p className="font-semibold">Why this design</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                    {(state.template.design?.notes ?? [state.template.description]).map((note) => <li key={note}>{note}</li>)}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">Saved to your templates and sent for review. You can use it right away.</p>
                </div>
              )}
              <div className="mt-7 flex flex-wrap gap-2">
                {state.template && <Button onClick={() => { onUse(state.template!); onOpenChange(false); }}><Sparkles /> Use this template</Button>}
                <Button variant="ghost" onClick={() => setAttempt((n) => n + 1)}><RotateCcw /> Try another</Button>
              </div>
            </>
          )}
        </div>
        <div className="bg-ambient-warm flex items-center justify-center border-t border-glass-border p-5 md:border-t-0 md:border-l md:p-6">
          {preview && state.template ? (
            <div key={state.template.id} className="animate-float-in w-full max-w-[240px] overflow-hidden rounded-2xl shadow-float md:max-w-none">
              <PosterThumb campaign={preview} template={state.template} className="aspect-[9/16] w-full" />
            </div>
          ) : (
            <div className="flex aspect-[9/16] w-full max-w-[240px] flex-col gap-3 rounded-2xl border border-glass-border bg-glass p-4 md:max-w-none">
              <Skeleton className="h-1/2 w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
              <Skeleton className="mt-auto h-10 w-full rounded-full" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
