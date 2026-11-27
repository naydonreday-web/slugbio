import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Briefcase,
  CalendarDays,
  Check,
  ClipboardList,
  Globe,
  HelpCircle,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  Pencil,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Ambient } from "@/components/slag/Ambient";
import { Logo } from "@/components/slag/Logo";
import { PosterThumb } from "@/components/slag/PosterThumb";
import { WibyTemplateDialog, samplePoster } from "@/components/slag/WibyTemplateDialog";
import {
  getTemplateConfig,
  hasTemplate,
  listTemplates,
  useTemplateCollections,
} from "@/lib/slag/templates/store";
import { ChoiceCard, Chip, Field, inputCls } from "@/components/slag/Choice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTIONS,
  AUDIENCES,
  PURPOSES,
  TONES,
  generateCampaign,
  inferPurpose,
  inferTitle,
} from "@/lib/slag/generate";
import { templateCampaigns } from "@/lib/slag/seed";
import { addCampaign, clearWizard, loadWizard, saveWizard } from "@/lib/slag/store";
import { THEMES, getTheme, suggestThemes } from "@/lib/slag/themes";
import { safeUrl, uid } from "@/lib/slag/blocks";
import type { Campaign, DesiredAction, Purpose, WizardAnswers } from "@/lib/slag/types";
import { useAuthGuard } from "@/lib/supabase/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  validateSearch: (s: Record<string, unknown>): { prompt?: string } => ({
    prompt: typeof s.prompt === "string" && s.prompt.trim() ? s.prompt.slice(0, 400) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create a campaign — SlugBio" },
      {
        name: "description",
        content:
          "Answer six quick questions and SlugBio's AI designs an editable, shareable campaign poster for you.",
      },
      { property: "og:title", content: "Create a campaign — SlugBio" },
      {
        property: "og:description",
        content:
          "Answer six quick questions and SlugBio's AI designs an editable, shareable campaign poster for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreateWizard,
});

const STEPS = [
  "Purpose",
  "Information",
  "Audience & tone",
  "Desired action",
  "Visual direction",
  "Review",
];
const PURPOSE_ICONS: Record<Purpose, typeof CalendarDays> = {
  event: CalendarDays,
  product: ShoppingBag,
  service: Briefcase,
  announcement: Megaphone,
  offer: BadgePercent,
  food: UtensilsCrossed,
  other: Sparkles,
};
const ACTION_ICONS: Record<DesiredAction, typeof CalendarDays> = {
  contact: MessageCircle,
  register: ClipboardList,
  buy: ShoppingCart,
  visit: MapPin,
  enquire: HelpCircle,
  learn: Globe,
};
const SUGGESTED_ACTION: Record<Purpose, DesiredAction> = {
  event: "register",
  product: "buy",
  service: "enquire",
  food: "visit",
  offer: "buy",
  announcement: "learn",
  other: "contact",
};
const PURPOSE_NOUN: Record<Purpose, string> = {
  event: "event",
  product: "product",
  service: "service",
  announcement: "announcement",
  offer: "offer",
  food: "spot",
  other: "campaign",
};

const empty = (): WizardAnswers => ({ title: "", headline: "", description: "", audience: [] });

const STAGES = [
  "Understanding the campaign",
  "Writing campaign content",
  "Creating the visual direction",
  "Assembling the poster",
  "Preparing editable elements",
];
const STAGE_MS = [900, 1200, 1000, 1000, 800];

function CreateWizard() {
  const auth = useAuthGuard();
  const { prompt } = Route.useSearch();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<WizardAnswers>(empty);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gen, setGen] = useState<{ stage: number; preview?: Campaign; error?: string } | null>(
    null,
  );
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (prompt) {
      const purpose = inferPurpose(prompt);
      setA({ ...empty(), prompt, purpose, title: inferTitle(prompt), description: "" });
      setStep(0);
    } else {
      const d = loadWizard();
      if (d && (d.answers.title || d.answers.purpose || d.answers.prompt)) {
        setA({ ...empty(), ...d.answers });
        setStep(Math.min(d.step, 5));
        setRestored(true);
      }
    }
    setMounted(true);
    return () => timers.current.forEach(clearTimeout);
  }, [prompt]);

  useEffect(() => {
    if (mounted) saveWizard({ step, answers: a });
  }, [a, step, mounted]);

  const up = (patch: Partial<WizardAnswers>) => setA((x) => ({ ...x, ...patch }));
  const purpose = a.purpose ?? "other";

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0 && !a.purpose)
      e.purpose = "Choose what you're creating so I can tailor the questions.";
    if (s === 1) {
      if (!a.title.trim()) e.title = "Give your campaign a name.";
      if (a.title.length > 80) e.title = "Keep it under 80 characters.";
    }
    if (s === 3) {
      if (!a.action) e.action = "Pick what visitors should do.";
      if (a.whatsapp && a.whatsapp.replace(/[^\d]/g, "").length < 8)
        e.whatsapp = "That number looks too short. Include the country code, e.g. +266.";
      if (a.url && !safeUrl(a.url)) e.url = "Enter a valid website address.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    if (step === 0 && !a.action && a.purpose) up({ action: SUGGESTED_ACTION[a.purpose] });
    setStep((s) => Math.min(5, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };
  const goTo = (s: number) => {
    setErrors({});
    setStep(s);
  };

  const startOver = () => {
    clearWizard();
    setA(empty());
    setStep(0);
    setRestored(false);
  };

  const generate = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    let preview: Campaign;
    try {
      const tpl =
        a.templateRef && hasTemplate(a.templateRef) ? getTemplateConfig(a.templateRef) : undefined;
      preview = generateCampaign(a, tpl);
    } catch {
      setGen({ stage: 0, error: "Something went wrong while generating. Your answers are safe." });
      return;
    }
    setGen({ stage: 0 });
    let t = 0;
    STAGE_MS.forEach((ms, i) => {
      t += ms;
      timers.current.push(
        window.setTimeout(
          () =>
            setGen((g) =>
              g ? { ...g, stage: i + 1, preview: i + 1 >= 3 ? preview : g.preview } : g,
            ),
          t,
        ),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        try {
          const saved = addCampaign(preview);
          clearWizard();
          navigate({ to: "/studio/$id", params: { id: saved.id }, search: { fresh: true } });
        } catch {
          setGen({
            stage: 5,
            error: "We couldn't save your poster. Check your browser storage and try again.",
          });
        }
      }, t + 500),
    );
  };
  const cancel = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setGen(null);
    toast("Generation cancelled", { description: "Your answers are still here." });
  };

  const useTemplate = (tpl: Campaign) => {
    const c = addCampaign({
      ...tpl,
      id: uid("c"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    navigate({ to: "/studio/$id", params: { id: c.id } });
  };

  const optional = step === 2;

  if (auth.loading || !auth.user)
    return (
      <div className="p-8">
        <Skeleton className="mx-auto h-[70vh] max-w-5xl rounded-3xl" />
      </div>
    );

  return (
    <div className="relative min-h-screen">
      <Ambient />
      <header className="glass fixed top-4 left-1/2 z-40 flex w-[95%] max-w-7xl -translate-x-1/2 items-center justify-between gap-3 rounded-full py-2.5 pr-2.5 pl-5 md:top-6">
        <Logo />
        <div className="hidden items-center gap-1.5 lg:flex" aria-label="Progress">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              disabled={i > step}
              onClick={() => goTo(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                i === step
                  ? "bg-foreground text-background"
                  : i < step
                    ? "text-foreground hover:bg-glass-strong"
                    : "text-muted-foreground",
              )}
            >
              {i < step ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              )}
              {s}
            </button>
          ))}
        </div>
        <Button asChild variant="glass" className="h-10 px-4 text-sm">
          <Link to="/">Save & exit</Link>
        </Button>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 pt-28 pb-32 md:px-8 md:pt-36 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-label-caps tracking-widest text-muted-foreground">
              STEP {String(step + 1).padStart(2, "0")} / 06 · {STEPS[step].toUpperCase()}
            </span>
            {restored && (
              <button
                onClick={startOver}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Start over
              </button>
            )}
          </div>
          <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((step + 1) / 6) * 100}%` }}
            />
          </div>

          {!mounted ? (
            <Skeleton className="h-[520px] rounded-3xl bg-glass" />
          ) : (
            <div key={step} className="animate-float-in pt-2 md:pt-4">
              {step === 0 && (
                <StepPurpose a={a} up={up} error={errors.purpose} onTemplate={useTemplate} />
              )}
              {step === 1 && <StepInfo a={a} up={up} errors={errors} />}
              {step === 2 && <StepAudience a={a} up={up} />}
              {step === 3 && <StepAction a={a} up={up} errors={errors} />}
              {step === 4 && <StepVisual a={a} up={up} />}
              {step === 5 && <StepReview a={a} goTo={goTo} />}

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-glass-border pt-5">
                <Button
                  variant="ghost"
                  onClick={back}
                  disabled={step === 0}
                  className={cn(step === 0 && "invisible")}
                >
                  <ArrowLeft /> Back
                </Button>
                <div className="flex items-center gap-2">
                  {optional && (
                    <Button variant="ghost" onClick={() => setStep(step + 1)}>
                      Skip
                    </Button>
                  )}
                  {step < 5 ? (
                    <Button size="lg" onClick={next}>
                      Continue <ArrowRight />
                    </Button>
                  ) : (
                    <Button size="lg" onClick={generate}>
                      <Wand2 /> Generate campaign
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="glass sticky top-32 rounded-[10px] p-5">
            <div className="text-label-caps text-muted-foreground">YOUR CAMPAIGN SO FAR</div>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <SummaryRow
                label="Purpose"
                value={a.purpose ? PURPOSES.find((p) => p.id === a.purpose)?.label : undefined}
              />
              <SummaryRow label="Name" value={a.title} />
              <SummaryRow label="Audience" value={a.audience.join(", ")} />
              <SummaryRow label="Tone" value={a.tone} />
              <SummaryRow
                label="Action"
                value={a.action ? ACTIONS.find((x) => x.id === a.action)?.label : undefined}
              />
              <SummaryRow label="Style" value={styleLabel(a)} />
            </dl>
            <p className="mt-5 border-t border-glass-border pt-4 text-xs text-muted-foreground">
              Your answers are saved as you go. Come back anytime.
            </p>
          </div>
        </aside>
      </main>

      {gen && <GeneratingOverlay gen={gen} onCancel={cancel} onRetry={generate} />}
    </div>
  );
}

function styleLabel(a: WizardAnswers): string | undefined {
  if (a.templateRef) return `${a.templateRef.name} (by Wiby)`;
  return a.themeId ? (a.themeId === "auto" ? "AI decides" : getTheme(a.themeId).name) : undefined;
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate font-semibold", !value && "font-normal text-outline")}>
        {value || "—"}
      </dd>
    </div>
  );
}

function AiBubble({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-8 flex gap-3 md:gap-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pill md:h-10 md:w-10">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight md:text-[32px]">
          {children}
        </h1>
        {sub && (
          <p className="mt-2 max-w-[60ch] text-[15px] text-muted-foreground md:text-body-md">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

type StepProps = { a: WizardAnswers; up: (p: Partial<WizardAnswers>) => void };

function StepPurpose({
  a,
  up,
  error,
  onTemplate,
}: StepProps & { error?: string; onTemplate: (c: Campaign) => void }) {
  const templates = useMemo(() => templateCampaigns(), []);
  useTemplateCollections();
  const styleTemplates = listTemplates();
  const stylePreviews = useMemo(
    () =>
      styleTemplates
        .slice(0, 8)
        .map((entry) => ({ ...entry, sample: samplePoster(a, entry.config) })),
    [styleTemplates, a],
  );
  const [wibyOpen, setWibyOpen] = useState(false);
  const chosen =
    a.templateRef && hasTemplate(a.templateRef) ? getTemplateConfig(a.templateRef) : null;
  const chosenPreview = useMemo(
    () => (chosen ? samplePoster(a, chosen) : null),
    [a, chosen],
  );
  const inferred = a.prompt ? inferPurpose(a.prompt) : undefined;
  return (
    <>
      <AiBubble
        sub={
          inferred && a.purpose === inferred
            ? `Sounds like ${PURPOSES.find((p) => p.id === inferred)?.label.toLowerCase()} — I've picked that for you. Change it if I'm wrong.`
            : "Pick the closest match. I'll only ask what I need after that."
        }
      >
        What are you creating?
      </AiBubble>
      <Field
        label="Describe it in a sentence"
        optional
        hint="e.g. “A jazz night at the old mill this Friday”"
      >
        <textarea
          rows={2}
          maxLength={400}
          value={a.prompt ?? ""}
          onChange={(e) => up({ prompt: e.target.value })}
          onBlur={() => {
            if (!a.prompt) return;
            const p = inferPurpose(a.prompt);
            up({ purpose: a.purpose ?? p, title: a.title || inferTitle(a.prompt) });
          }}
          className={cn(inputCls, "resize-none")}
          placeholder="Tell me what it's about…"
        />
      </Field>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {PURPOSES.map((p) => {
          const Icon = PURPOSE_ICONS[p.id];
          return (
            <ChoiceCard
              key={p.id}
              selected={a.purpose === p.id}
              onClick={() => up({ purpose: p.id, action: undefined })}
              title={p.label}
              hint={p.hint}
              icon={<Icon className="h-5 w-5" />}
            />
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-label-caps text-muted-foreground">APPROVED DESIGNS</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a ready-made layout for your campaign.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/styles">Browse styles</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stylePreviews.map(({ config, status, sample }) => (
            <button
              key={`${config.id}@${config.version}`}
              type="button"
              onClick={() =>
                up({
                  templateRef: { id: config.id, version: config.version, name: config.name },
                  themeId: undefined,
                })
              }
              className={cn(
                "group overflow-hidden rounded-2xl border bg-glass text-left transition-shadow hover:shadow-float",
                a.templateRef?.id === config.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-glass-border",
              )}
            >
              <PosterThumb campaign={sample} template={config} className="aspect-[4/5] w-full" />
              <div className="p-3">
                <div className="truncate text-[13px] leading-snug font-semibold group-hover:text-primary-ink">
                  {config.name}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {status === "approved" ? "Approved" : "Only you can see this"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-9">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-label-caps text-muted-foreground">OR START FROM A TEMPLATE</div>
          <Button variant="glass" size="sm" onClick={() => setWibyOpen(true)}>
            <Sparkles /> Use new template
          </Button>
        </div>
        {chosen && chosenPreview && a.templateRef && (
          <div className="mb-4 flex animate-float-in items-center gap-3 rounded-2xl border border-primary bg-glass p-3 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_14%,transparent)]">
            <PosterThumb
              campaign={chosenPreview}
              template={chosen}
              className="h-20 w-16 shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold">{a.templateRef.name}</div>
              <div className="text-xs text-muted-foreground">
                Wiby's new template · your poster will use it
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setWibyOpen(true)}
            >
              Change
            </Button>
            <button
              type="button"
              onClick={() => up({ templateRef: undefined })}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-glass-strong hover:text-foreground"
              aria-label="Remove Wiby's template"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {templates.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => onTemplate(t)}
              className="group overflow-hidden rounded-2xl border border-glass-border bg-glass text-left transition-shadow hover:shadow-float"
            >
              <PosterThumb campaign={t} className="aspect-[4/5] w-full" />
              <div className="p-3 text-[13px] leading-snug font-semibold group-hover:text-primary-ink">
                {t.title}
              </div>
            </button>
          ))}
        </div>
      </div>
      <WibyTemplateDialog
        open={wibyOpen}
        onOpenChange={setWibyOpen}
        answers={a}
        onUse={(t) => {
          up({ templateRef: { id: t.id, version: t.version, name: t.name }, themeId: undefined });
          toast.success(`Using “${t.name}”`, {
            description: "Keep going — your poster will be built in this template.",
          });
        }}
      />
    </>
  );
}

function StepInfo({ a, up, errors }: StepProps & { errors: Record<string, string> }) {
  const p = a.purpose ?? "other";
  const f = (
    k: keyof WizardAnswers,
    label: string,
    placeholder: string,
    opts: { hint?: string; type?: string } = {},
  ) => (
    <Field label={label} optional hint={opts.hint}>
      <input
        type={opts.type ?? "text"}
        maxLength={120}
        value={(a[k] as string) ?? ""}
        onChange={(e) => up({ [k]: e.target.value } as Partial<WizardAnswers>)}
        placeholder={placeholder}
        className={inputCls}
      />
    </Field>
  );
  return (
    <>
      <AiBubble sub="Only the name is required. Skip anything you're unsure of — I'll write sensible copy and you can edit it later.">
        Tell me about your {PURPOSE_NOUN[p]}.
      </AiBubble>
      <div className="flex flex-col gap-5">
        <Field label="Campaign name" error={errors.title}>
          <input
            autoFocus
            maxLength={80}
            value={a.title}
            onChange={(e) => up({ title: e.target.value })}
            placeholder={
              p === "event"
                ? "e.g. Neon Sunset Music Fest"
                : p === "food"
                  ? "e.g. Artisan Coffee Pop-up"
                  : "e.g. Summer Collection Launch"
            }
            className={inputCls}
          />
        </Field>
        <Field label="Headline" optional hint="Leave blank and AI will write one from your name.">
          <input
            maxLength={100}
            value={a.headline}
            onChange={(e) => up({ headline: e.target.value })}
            placeholder="The big line people see first"
            className={inputCls}
          />
        </Field>
        <Field label="Description" optional>
          <textarea
            rows={3}
            maxLength={600}
            value={a.description}
            onChange={(e) => up({ description: e.target.value })}
            placeholder="What is it, and why should people care?"
            className={cn(inputCls, "resize-none")}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          {(p === "event" || p === "other" || p === "announcement") &&
            f("date", "Date", "e.g. Saturday, 19 December")}
          {p === "event" && f("time", "Time", "e.g. 16:00 until late")}
          {p === "food" && f("date", "Days", "e.g. Fri – Sun, 4–6 December")}
          {p === "food" && f("time", "Opening hours", "e.g. 07:00 – 15:00")}
          {(p === "event" || p === "food" || p === "other" || p === "announcement") &&
            f("venue", p === "event" ? "Venue" : "Location", "e.g. Kingsway Arcade, Maseru")}
          {(p === "product" || p === "offer" || p === "food") &&
            f("price", p === "offer" ? "Offer price" : "Price", "e.g. M250")}
          {(p === "product" || p === "offer") &&
            f("originalPrice", "Usual price", "e.g. M350", {
              hint: "Shown crossed out next to your price.",
            })}
          {p === "offer" && f("validUntil", "Valid until", "e.g. 31 December")}
          {p === "service" && f("price", "Starting price", "e.g. From M500")}
          {p === "service" && f("venue", "Area you serve", "e.g. Maseru & remote")}
        </div>
        <Field
          label="Other key details"
          optional
          hint="One per line — e.g. dress code, parking, what's included."
        >
          <textarea
            rows={2}
            maxLength={400}
            value={a.keyDetails ?? ""}
            onChange={(e) => up({ keyDetails: e.target.value })}
            className={cn(inputCls, "resize-none")}
          />
        </Field>
      </div>
    </>
  );
}

function StepAudience({ a, up }: StepProps) {
  return (
    <>
      <AiBubble sub="This shapes the wording and style. Optional — skip if it's for everyone.">
        Who is it for, and how should it sound?
      </AiBubble>
      <div className="text-sm font-semibold">Audience</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {AUDIENCES.map((x) => (
          <Chip
            key={x}
            selected={a.audience.includes(x)}
            onClick={() =>
              up({
                audience: a.audience.includes(x)
                  ? a.audience.filter((y) => y !== x)
                  : [...a.audience, x],
              })
            }
          >
            {x}
          </Chip>
        ))}
      </div>
      <div className="mt-4">
        <Field label="Anyone specific?" optional>
          <input
            maxLength={120}
            value={a.audienceNote ?? ""}
            onChange={(e) => up({ audienceNote: e.target.value })}
            placeholder="e.g. coffee lovers who work in town"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="mt-7 text-sm font-semibold">Tone</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TONES.map((t) => (
          <Chip
            key={t}
            selected={a.tone === t}
            onClick={() => up({ tone: a.tone === t ? undefined : t })}
          >
            {t}
          </Chip>
        ))}
      </div>
    </>
  );
}

function StepAction({ a, up, errors }: StepProps & { errors: Record<string, string> }) {
  const p = a.purpose ?? "other";
  const suggested = SUGGESTED_ACTION[p];
  return (
    <>
      <AiBubble
        sub={`For ${p === "other" ? "most campaigns" : `a ${PURPOSE_NOUN[p]}`}, “${ACTIONS.find((x) => x.id === suggested)?.label}” usually works best — but it's your call.`}
      >
        What should visitors do?
      </AiBubble>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACTIONS.map((x) => {
          const Icon = ACTION_ICONS[x.id];
          return (
            <ChoiceCard
              key={x.id}
              selected={a.action === x.id}
              onClick={() => up({ action: x.id })}
              title={x.label + (x.id === suggested ? " · Suggested" : "")}
              hint={x.hint}
              icon={<Icon className="h-5 w-5" />}
            />
          );
        })}
      </div>
      {errors.action && (
        <p className="mt-3 text-sm font-semibold text-destructive">{errors.action}</p>
      )}
      {a.action && (
        <div className="mt-6 flex animate-float-in flex-col gap-4 rounded-2xl border border-glass-border bg-glass p-4 md:p-5">
          {(a.action === "contact" ||
            a.action === "buy" ||
            a.action === "register" ||
            a.action === "enquire") && (
            <Field
              label="WhatsApp number"
              optional={a.action !== "contact"}
              error={errors.whatsapp}
              hint={
                a.action === "contact"
                  ? "Your button opens a WhatsApp chat with this number. You can add it later too."
                  : "Shown as a contact detail on your poster."
              }
            >
              <input
                type="tel"
                inputMode="tel"
                maxLength={20}
                value={a.whatsapp ?? ""}
                onChange={(e) => up({ whatsapp: e.target.value })}
                placeholder="+266 5800 1234"
                className={inputCls}
              />
            </Field>
          )}
          {(a.action === "buy" || a.action === "learn") && (
            <Field
              label={a.action === "buy" ? "Shop link" : "Website"}
              optional={a.action === "buy"}
              error={errors.url}
              hint={
                a.action === "buy"
                  ? "No shop? Leave blank and the button will open WhatsApp instead."
                  : undefined
              }
            >
              <input
                type="url"
                inputMode="url"
                maxLength={200}
                value={a.url ?? ""}
                onChange={(e) => up({ url: e.target.value })}
                placeholder="https://"
                className={inputCls}
              />
            </Field>
          )}
          {a.action === "visit" && (
            <Field label="Address" optional hint="Your button opens directions in Google Maps.">
              <input
                maxLength={160}
                value={a.address ?? a.venue ?? ""}
                onChange={(e) => up({ address: e.target.value })}
                placeholder="Street, town"
                className={inputCls}
              />
            </Field>
          )}
          {(a.action === "register" || a.action === "enquire") && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> I'll add a{" "}
              {a.action === "register" ? "registration" : "enquiry"} block. Add a Google Forms
              responder link in the editor before publishing.
            </p>
          )}
        </div>
      )}
    </>
  );
}

function StepVisual({ a, up }: StepProps) {
  const [all, setAll] = useState(false);
  const ids = suggestThemes(a.purpose, a.tone);
  const previews = ids.map((id) =>
    generateCampaign({ ...a, title: a.title || "Your campaign", themeId: id }),
  );
  return (
    <>
      {a.templateRef && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary bg-glass p-4">
          <p className="text-sm">
            <Sparkles className="mr-1.5 inline h-4 w-4 text-primary" />
            You're using Wiby's <span className="font-bold">{a.templateRef.name}</span> template.
          </p>
          <Button variant="ghost" size="sm" onClick={() => up({ templateRef: undefined })}>
            Choose a style instead
          </Button>
        </div>
      )}
      <AiBubble
        sub={`Three directions that suit ${a.tone ? `a ${a.tone.toLowerCase()} ` : "your "}${PURPOSE_NOUN[a.purpose ?? "other"]}. Pick one, or let me decide — you can change it anytime in the studio.`}
      >
        Which look feels right?
      </AiBubble>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <button
          type="button"
          onClick={() => up({ themeId: "auto", templateRef: undefined })}
          aria-pressed={!a.templateRef && (a.themeId === "auto" || !a.themeId)}
          className={cn(
            "bg-ambient-warm flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition-all md:aspect-auto",
            !a.templateRef && (a.themeId === "auto" || !a.themeId)
              ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
              : "border-glass-border",
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Wand2 className="h-5 w-5" />
          </span>
          <span className="text-[15px] font-bold">Let AI decide</span>
          <span className="text-xs text-muted-foreground">Best match for your purpose & tone</span>
        </button>
        {previews.map((c, i) => (
          <button
            key={ids[i]}
            type="button"
            onClick={() => up({ themeId: ids[i], templateRef: undefined })}
            aria-pressed={a.themeId === ids[i]}
            className={cn(
              "overflow-hidden rounded-2xl border text-left transition-all",
              a.themeId === ids[i]
                ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
                : "border-glass-border hover:shadow-float",
            )}
          >
            <PosterThumb campaign={c} className="aspect-[4/5] w-full" />
            <div className="flex items-center justify-between gap-2 bg-glass-strong p-3">
              <span className="text-[13px] font-bold">{c.theme.name}</span>
              {a.themeId === ids[i] && <Check className="h-4 w-4 text-primary" />}
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setAll(!all)}
        className="mt-5 text-sm font-semibold text-primary-ink"
      >
        {all ? "Hide other styles" : "See all styles"}
      </button>
      {all && (
        <div className="mt-3 flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => up({ themeId: t.id, templateRef: undefined })}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm font-semibold",
                a.themeId === t.id ? "border-foreground" : "border-glass-border bg-glass",
              )}
            >
              <span className="flex overflow-hidden rounded-full border border-glass-border">
                <span className="h-6 w-4" style={{ background: t.bg }} />
                <span className="h-6 w-4" style={{ background: t.accent }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function StepReview({ a, goTo }: { a: WizardAnswers; goTo: (s: number) => void }) {
  const purpose = PURPOSES.find((p) => p.id === a.purpose)?.label;
  const rows: { step: number; label: string; value: string }[] = [
    { step: 0, label: "Purpose", value: purpose ?? "—" },
    { step: 1, label: "Name", value: a.title },
    { step: 1, label: "Headline", value: a.headline || "AI will write it" },
    { step: 1, label: "Description", value: a.description || "AI will write it" },
    {
      step: 1,
      label: "Details",
      value:
        [
          a.date,
          a.time,
          a.venue,
          a.price && `Price ${a.price}`,
          a.validUntil && `Until ${a.validUntil}`,
        ]
          .filter(Boolean)
          .join(" · ") || "—",
    },
    {
      step: 2,
      label: "Audience & tone",
      value: [a.audience.join(", "), a.tone].filter(Boolean).join(" · ") || "Everyone · Friendly",
    },
    {
      step: 3,
      label: "Desired action",
      value:
        [ACTIONS.find((x) => x.id === a.action)?.label, a.whatsapp, a.url]
          .filter(Boolean)
          .join(" · ") || "—",
    },
    { step: 4, label: "Visual direction", value: styleLabel(a) ?? "AI decides" },
  ];
  return (
    <>
      <AiBubble sub="Check everything looks right. You can edit any answer — nothing gets lost.">
        Ready to generate your poster?
      </AiBubble>
      <dl className="divide-y divide-glass-border overflow-hidden rounded-2xl border border-glass-border bg-glass">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-4 px-4 py-3.5">
            <dt className="w-32 shrink-0 text-sm text-muted-foreground md:w-40">{r.label}</dt>
            <dd className="min-w-0 flex-1 text-sm font-semibold break-words">{r.value}</dd>
            <button
              type="button"
              onClick={() => goTo(r.step)}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-ink"
              aria-label={`Edit ${r.label}`}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        ))}
      </dl>
    </>
  );
}

function GeneratingOverlay({
  gen,
  onCancel,
  onRetry,
}: {
  gen: { stage: number; preview?: Campaign; error?: string };
  onCancel: () => void;
  onRetry: () => void;
}) {
  const pct = Math.min(100, (gen.stage / STAGES.length) * 100);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal
      aria-label="Generating your campaign"
    >
      <div className="glass-strong grid w-full max-w-[860px] overflow-hidden rounded-3xl md:grid-cols-[1fr_300px]">
        <div className="flex flex-col p-6 md:p-9">
          <span className="text-label-caps text-muted-foreground">AI GENERATION</span>
          <h2 className="mt-3 text-[26px] leading-tight font-bold tracking-tight md:text-headline-md">
            {gen.error
              ? "Generation stopped"
              : gen.stage >= STAGES.length
                ? "Your poster is ready"
                : "Designing your poster…"}
          </h2>
          {gen.error ? (
            <>
              <p className="mt-3 text-muted-foreground">{gen.error}</p>
              <div className="mt-8 flex gap-2">
                <Button onClick={onRetry}>
                  <RotateCcw /> Try again
                </Button>
                <Button variant="ghost" onClick={onCancel}>
                  Back to review
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <ol className="mt-6 flex flex-col gap-3.5">
                {STAGES.map((s, i) => {
                  const done = gen.stage > i;
                  const active = gen.stage === i;
                  return (
                    <li
                      key={s}
                      className={cn(
                        "flex items-center gap-3 text-[15px] transition-opacity",
                        !done && !active && "opacity-45",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border",
                          done
                            ? "border-lime bg-lime text-lime-foreground"
                            : "border-glass-border bg-glass",
                        )}
                      >
                        {done ? (
                          <Check className="h-4 w-4" />
                        ) : active ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </span>
                      <span className={cn(active && "font-semibold")}>{s}</span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-8">
                <Button variant="ghost" onClick={onCancel} disabled={gen.stage >= STAGES.length}>
                  <X /> Cancel
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="bg-ambient-warm relative hidden items-center justify-center border-l border-glass-border p-6 md:flex">
          {gen.preview ? (
            <div className="animate-float-in w-full overflow-hidden rounded-2xl shadow-float">
              <PosterThumb campaign={gen.preview} className="aspect-[9/16] w-full" />
            </div>
          ) : (
            <div className="flex aspect-[9/16] w-full flex-col gap-3 rounded-2xl border border-glass-border bg-glass p-4">
              <Skeleton className="h-1/2 w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
              <Skeleton className="mt-auto h-10 w-full rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
