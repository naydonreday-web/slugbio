import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Ambient } from "@/components/slag/Ambient";
import { Logo } from "@/components/slag/Logo";
import { Chip, Field, inputCls } from "@/components/slag/Choice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LESOTHO_CODE, USAGES, firstName, localLesothoPhone, parseLesothoPhone, profileSchema, type Profile, type Usage } from "@/lib/slag/profile";
import { saveProfile, useStore } from "@/lib/slag/store";
import { cn } from "@/lib/utils";
import { useAuthGuard } from "@/lib/supabase/use-auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — SlugBio" },
      { name: "description", content: "Add your name and Lesotho phone number to start creating campaign posters on SlugBio." },
      { property: "og:title", content: "Set up your profile — SlugBio" },
      { property: "og:description", content: "Add your name and Lesotho phone number to start creating campaign posters on SlugBio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const auth = useAuthGuard();
  const { ready, profile } = useStore();
  if (auth.loading || !auth.user) return <div className="p-8"><Skeleton className="mx-auto h-[70vh] max-w-xl rounded-3xl" /></div>;
  return (
    <div className="relative min-h-screen">
      <Ambient />
      <header className="glass fixed top-4 left-1/2 z-40 flex w-[95%] max-w-7xl -translate-x-1/2 items-center justify-between gap-3 rounded-full py-2.5 pr-2.5 pl-5 md:top-6">
        <Logo />
        <Button asChild variant="glass" className="h-10 px-4 text-sm">
          <Link to="/">{profile ? "Back" : "Skip for now"}</Link>
        </Button>
      </header>
      <main className="mx-auto w-full max-w-[600px] px-4 pt-28 pb-24 md:pt-36">
        <span className="text-label-caps tracking-widest text-muted-foreground">{profile ? "YOUR PROFILE" : "WELCOME · TAKES ABOUT 30 SECONDS"}</span>
        <div className="mt-4">{ready ? <ProfileForm initial={profile} /> : <Skeleton className="h-[560px] rounded-3xl" />}</div>
      </main>
    </div>
  );
}

function ProfileForm({ initial }: { initial?: Profile }) {
  const navigate = useNavigate();
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial ? localLesothoPhone(initial.phone) : "");
  const [usage, setUsage] = useState<Usage[]>(initial?.usage ?? []);
  const [tried, setTried] = useState(false);

  const result = profileSchema.safeParse({ name, phone, usage });
  const errors: Partial<Record<"name" | "phone", string>> = {};
  if (!result.success) for (const i of result.error.issues) errors[i.path[0] as "name" | "phone"] ??= i.message;

  const toggle = (u: Usage) => setUsage((cur) => (cur.includes(u) ? cur.filter((x) => x !== u) : [...cur, u]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!result.success) return;
    saveProfile({ ...result.data, completedAt: initial?.completedAt ?? new Date().toISOString() });
    toast.success(editing ? "Profile updated" : `You're all set, ${firstName(result.data.name)}`, editing ? undefined : { description: "Let's create your first campaign." });
    navigate({ to: "/" });
  };

  return (
    <form onSubmit={submit} noValidate className="glass animate-float-in rounded-3xl p-5 md:p-8">
      <div className="mb-7 flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-glass-border bg-primary/15">
          <Sparkles className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0 rounded-2xl rounded-tl-none border border-glass-border bg-glass-strong px-4 py-3">
          <h1 className="text-[22px] leading-tight font-bold tracking-tight md:text-headline-md">{editing ? "Your details" : "Welcome to SlugBio. Let's get you set up."}</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">{editing ? "Update your name, number or how you plan to use SlugBio." : "Just two details, and one optional question."}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Field label="Your name" error={tried ? errors.name : undefined}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} placeholder="e.g. Lerato Mokoena" className={cn(inputCls, tried && errors.name && "border-destructive")} aria-invalid={tried && !!errors.name} />
        </Field>

        <Field label="Phone number" error={tried ? errors.phone : undefined} hint="Lesotho (+266) numbers only.">
          <div className={cn("flex items-stretch overflow-hidden rounded-xl border border-input bg-background/70 transition-shadow focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15", tried && errors.phone && "border-destructive")}>
            <span className="flex shrink-0 items-center gap-1.5 border-r border-input bg-surface-container px-3 text-[15px] font-semibold">
              <span className="text-label-caps text-muted-foreground">LS</span> {LESOTHO_CODE}
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={18}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => { const r = parseLesothoPhone(phone); if (r.ok) setPhone(localLesothoPhone(r.e164)); }}
              placeholder="5800 1234"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-outline"
              aria-invalid={tried && !!errors.phone}
            />
          </div>
        </Field>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold">
            What will you use SlugBio for? <span className="font-normal text-muted-foreground">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {USAGES.map((u) => (
              <Chip key={u} selected={usage.includes(u)} onClick={() => toggle(u)}>
                <span className="flex items-center gap-1.5">{usage.includes(u) && <Check className="h-3.5 w-3.5" />}{u}</span>
              </Chip>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Pick any that fit. This helps us suggest better templates.</span>
        </fieldset>
      </div>

      <div className="mt-8 flex items-center justify-end gap-2 border-t border-glass-border pt-5">
        <Button type="submit" size="lg">{editing ? "Save changes" : "Continue"} {!editing && <ArrowRight />}</Button>
      </div>
    </form>
  );
}
