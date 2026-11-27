import { useRef } from "react";
import { Bold, ChevronDown, ChevronRight, ChevronUp, ImagePlus, Italic, RotateCcw, Sparkles, Trash2, Underline } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BLOCK_META } from "@/lib/slag/blocks";
import { safeGoogleFormUrl } from "@/lib/slag/blocks";
import { BLOCK_ELEMENTS, elementMeta, elementPreview, getElementStyle, isBold } from "@/lib/slag/elements";
import { IMAGE_LIBRARY, resolveImage } from "@/lib/slag/images";
import { POSTER_FONTS } from "@/lib/slag/themes";
import type { Block, BlockContent, Campaign, CtaAction, ElementKey, ElementStyle, PosterFont } from "@/lib/slag/types";
import { canonicalStyleId, defaultStyleId, getStyle, missingRequirements, parseEndsAt, styleContext, stylesFor } from "@/lib/slag/templates/styles";
import { cn } from "@/lib/utils";

type Props = {
  doc: Campaign;
  selected: Block | null;
  /** Element inside the selected block, or null when the whole block is selected. */
  element: ElementKey | null;
  onPick: (id: string) => void;
  onPickElement: (key: ElementKey | null) => void;
  onClear: () => void;
  editBlock: (id: string, patch: Partial<BlockContent>) => void;
  styleBlock: (id: string, patch: Partial<Block["style"]>) => void;
  styleElement: (id: string, key: ElementKey, patch: Partial<ElementStyle>) => void;
  move: (dir: -1 | 1) => void;
  remove: () => void;
  /** Hand the current selection over to the AI assistant. */
  onAskAi?: () => void;
};

const ACTIONS: { id: CtaAction; label: string; target: string; placeholder: string }[] = [
  { id: "whatsapp", label: "WhatsApp", target: "WhatsApp number", placeholder: "+266 5800 0000" },
  { id: "url", label: "Website", target: "Link", placeholder: "example.com/tickets" },
  { id: "form", label: "Form", target: "", placeholder: "" },
  { id: "phone", label: "Call", target: "Phone number", placeholder: "+266 2231 0000" },
  { id: "email", label: "Email", target: "Email address", placeholder: "hello@example.com" },
];

const MAX_UPLOAD = 1.5 * 1024 * 1024;

/** Properties for the selected element or block, or a block picker when nothing is selected. */
export function Inspector(props: Props) {
  const { doc, selected, element, onPick, onPickElement, onClear, move, remove, onAskAi } = props;
  if (!selected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Tap a headline, button, text or photo on the poster to edit just that piece, or pick a block:</p>
        <div className="flex flex-wrap gap-1.5">
          {doc.blocks.map((b) => (
            <button key={b.id} type="button" onClick={() => onPick(b.id)} className="rounded-full border border-glass-border bg-glass px-3 py-1.5 text-xs font-semibold hover:bg-glass-strong">
              {BLOCK_META[b.type].label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  const meta = elementMeta(selected.type, element);
  const i = doc.blocks.indexOf(selected);
  const blockLabel = BLOCK_META[selected.type].label;
  return (
    <div className="space-y-4">
      <nav aria-label="Selection" className="flex min-w-0 flex-wrap items-center gap-0.5 text-sm">
        <Crumb onClick={onClear}>Poster</Crumb>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Crumb onClick={meta ? () => onPickElement(null) : undefined} current={!meta}>{meta?.label === blockLabel ? `${blockLabel} block` : blockLabel}</Crumb>
        {meta && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Crumb current>{meta.label}</Crumb>
          </>
        )}
      </nav>
      <div className="flex items-center gap-1">
        {onAskAi && (
          <Button variant="glass" size="sm" onClick={onAskAi} className="mr-auto h-8 gap-1.5 px-3" aria-label={`Ask AI to change the ${(meta?.label ?? blockLabel).toLowerCase()}`}>
            <Sparkles className="text-primary" /> Ask AI
          </Button>
        )}
        {!meta && (
          <>
            <Button variant="ghost" size="icon" onClick={() => move(-1)} disabled={i <= 0} aria-label="Move block up"><ChevronUp /></Button>
            <Button variant="ghost" size="icon" onClick={() => move(1)} disabled={i >= doc.blocks.length - 1} aria-label="Move block down"><ChevronDown /></Button>
            <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete block"><Trash2 /></Button>
          </>
        )}
      </div>
      {meta ? <ElementControls {...props} selected={selected} elementKey={meta.key} /> : <BlockControls {...props} selected={selected} />}
    </div>
  );
}

function Crumb({ children, onClick, current }: { children: React.ReactNode; onClick?: () => void; current?: boolean }) {
  if (!onClick) return <span aria-current={current ? "true" : undefined} className="truncate rounded-full px-1.5 py-0.5 font-bold">{children}</span>;
  return (
    <button type="button" onClick={onClick} className="truncate rounded-full px-1.5 py-0.5 font-semibold text-muted-foreground hover:bg-glass-strong hover:text-foreground">
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-glass-border pt-4">
      <h3 className="text-label-caps text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

const inputCls = "w-full rounded-xl border border-input bg-background/70 px-3 py-2 text-base font-normal outline-none focus:border-primary md:text-sm";

function dateInputValue(value?: string) {
  const date = parseEndsAt(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Whole-block view: the pieces inside it plus layout settings. */
function BlockControls({ doc, selected: b, onPickElement, styleBlock, editBlock }: Props & { selected: Block }) {
  const styles = stylesFor(b.type);
  const currentStyle = canonicalStyleId(b.type, b.style.variant) ?? defaultStyleId(b.type);
  const selectedStyle = getStyle(currentStyle);
  const missing = selectedStyle ? missingRequirements(selectedStyle, b, styleContext(doc.blocks)) : [];
  return (
    <>
      <Section title="In this block">
        <ul className="flex flex-col gap-1.5">
          {BLOCK_ELEMENTS[b.type].map((m) => (
            <li key={m.key}>
              <button type="button" onClick={() => onPickElement(m.key)} className="flex w-full items-center gap-3 rounded-xl border border-glass-border bg-glass px-3 py-2 text-left hover:bg-glass-strong">
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{m.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{elementPreview(b, m.key)}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </Section>
      {styles.length > 0 && currentStyle && (
        <Section title="Visual style">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            {BLOCK_META[b.type].label} treatment
            <select
              value={currentStyle}
              onChange={(event) => styleBlock(b.id, { variant: event.target.value })}
              className={inputCls}
            >
              {styles.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}
            </select>
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">{getStyle(currentStyle)?.description}</p>
          {missing.length > 0 && <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">Needs {missing.join(", ")}. This block will use its fallback until you add it.</p>}
        </Section>
      )}
      {b.type === "form" && (
        <Section title="Google Forms">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Google Form responder link
            <input
              type="url"
              value={b.content.googleFormUrl ?? ""}
              onChange={(event) => editBlock(b.id, { googleFormUrl: event.target.value || undefined })}
              placeholder="https://forms.gle/..."
              aria-invalid={!!b.content.googleFormUrl && !safeGoogleFormUrl(b.content.googleFormUrl)}
              className={inputCls}
            />
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Paste the responder link from Google Forms. Visitors will complete the form on Google; SlagBio no longer collects form answers.
          </p>
          {!!b.content.googleFormUrl && !safeGoogleFormUrl(b.content.googleFormUrl) && (
            <p role="alert" className="text-xs font-semibold text-destructive">
              Use a secure forms.gle or docs.google.com/forms responder link.
            </p>
          )}
          {!b.content.googleFormUrl && (
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Add a responder link before publishing.
            </p>
          )}
        </Section>
      )}
      {b.type === "offer" && (
        <Section title="Offer timing">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Offer end date
            <input
              type="date"
              value={dateInputValue(b.content.endsAt)}
              onChange={(event) => editBlock(b.id, { endsAt: event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : undefined })}
              className={inputCls}
            />
          </label>
          <p className="text-xs text-muted-foreground">Used by countdown offer styles. The offer remains visible after it ends.</p>
        </Section>
      )}
      <Section title="Layout">
        <label className="flex flex-col gap-1 text-xs font-semibold">Spacing {b.style.padding}px
          <input type="range" min={12} max={120} value={b.style.padding} onChange={(e) => styleBlock(b.id, { padding: +e.target.value })} className="accent-primary" />
        </label>
        <label className="flex items-center justify-between text-xs font-semibold">Background
          <input type="color" value={b.style.bg ?? doc.theme.bg} onChange={(e) => styleBlock(b.id, { bg: e.target.value })} />
        </label>
        <div className="flex items-center justify-between gap-2 text-xs font-semibold">Alignment
          <div className="flex gap-1.5">
            {(["left", "center"] as const).map((al) => (
              <Button key={al} size="sm" variant={b.style.align === al ? "default" : "glass"} onClick={() => styleBlock(b.id, { align: al })} className="h-8 capitalize">{al}</Button>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

/** Focused controls for one text, button or photo. */
function ElementControls({ doc, selected: b, elementKey: k, editBlock, styleBlock, styleElement }: Props & { selected: Block; elementKey: ElementKey }) {
  const meta = elementMeta(b.type, k)!;
  if (meta.kind === "image") return <ImageControls b={b} editBlock={editBlock} />;
  const el = getElementStyle(b, k);
  const bold = isBold(b, k);
  const fmt = (patch: Partial<ElementStyle>) => styleElement(b.id, k, patch);
  const action = ACTIONS.find((a) => a.id === (b.content.action ?? "whatsapp")) ?? ACTIONS[0];
  return (
    <>
      <label className="flex flex-col gap-1 text-xs font-semibold">{meta.kind === "button" ? "Button text" : "Text"}
        <textarea rows={meta.multiline ? 4 : 2} value={b.content[k] ?? ""} onChange={(e) => editBlock(b.id, { [k]: e.target.value })} className={inputCls} />
      </label>
      <Section title="Format">
        <div className="flex items-center gap-1.5" role="group" aria-label="Text style">
          <Toggle label="Bold" pressed={bold} onClick={() => fmt({ bold: !bold })}><Bold /></Toggle>
          <Toggle label="Italic" pressed={!!el.italic} onClick={() => fmt({ italic: el.italic ? undefined : true })}><Italic /></Toggle>
          <Toggle label="Underline" pressed={!!el.underline} onClick={() => fmt({ underline: el.underline ? undefined : true })}><Underline /></Toggle>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold">Font
          <select value={el.font ?? ""} onChange={(e) => fmt({ font: (e.target.value || undefined) as PosterFont | undefined })} className={inputCls}>
            <option value="">Poster font ({POSTER_FONTS[doc.theme.font]?.label})</option>
            {Object.entries(POSTER_FONTS).map(([id, f]) => <option key={id} value={id}>{f.label}</option>)}
          </select>
        </label>
        {meta.heading && (
          <label className="flex flex-col gap-1 text-xs font-semibold">Size {Math.round(b.style.headingScale * 100)}%
            <input type="range" min={70} max={180} value={b.style.headingScale * 100} onChange={(e) => styleBlock(b.id, { headingScale: +e.target.value / 100 })} className="accent-primary" />
          </label>
        )}
        <div className="flex items-center justify-between text-xs font-semibold">Text colour
          <span className="flex items-center gap-1">
            {el.color && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fmt({ color: undefined })} aria-label="Reset text colour"><RotateCcw /></Button>}
            <input type="color" aria-label="Text colour" value={el.color ?? b.style.text ?? (meta.kind === "button" ? doc.theme.accentText : doc.theme.text)} onChange={(e) => fmt({ color: e.target.value })} />
          </span>
        </div>
        {meta.kind === "button" && (
          <div className="flex items-center justify-between text-xs font-semibold">Button colour
            <input type="color" aria-label="Button colour" value={b.style.accent ?? doc.theme.accent} onChange={(e) => styleBlock(b.id, { accent: e.target.value })} />
          </div>
        )}
      </Section>
      {meta.kind === "button" && (
        <Section title="When tapped">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Button action">
            {ACTIONS.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={action.id === a.id} onClick={() => editBlock(b.id, { action: a.id })} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", action.id === a.id ? "border-foreground bg-foreground text-background" : "border-glass-border bg-glass hover:bg-glass-strong")}>
                {a.label}
              </button>
            ))}
          </div>
          {action.id === "form" ? (
            <p className="text-xs text-muted-foreground">
              {doc.blocks.find((x) => x.type === "form")?.content.googleFormUrl
                ? "Opens the linked Google Form. Responses stay in your Google account."
                : "Add a Google Forms responder link to this poster before publishing."}
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs font-semibold">{action.target}
                <input value={b.content.target ?? ""} onChange={(e) => editBlock(b.id, { target: e.target.value })} placeholder={action.id === "url" ? "https://forms.gle/... or your website" : action.placeholder} inputMode={action.id === "whatsapp" || action.id === "phone" ? "tel" : action.id === "email" ? "email" : "url"} className={inputCls} />
              </label>
              {action.id === "url" && (
                <p className="text-xs text-muted-foreground">Paste a Google Forms responder link here to send people to Google Forms.</p>
              )}
            </>
          )}
          {action.id === "whatsapp" && (
            <label className="flex flex-col gap-1 text-xs font-semibold">Pre-filled message
              <textarea rows={2} value={b.content.message ?? ""} onChange={(e) => editBlock(b.id, { message: e.target.value })} className={inputCls} />
            </label>
          )}
        </Section>
      )}
    </>
  );
}

function Toggle({ label, pressed, onClick, children }: { label: string; pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} title={label} onClick={onClick} className={cn("flex h-9 w-9 items-center justify-center rounded-xl border transition-colors [&_svg]:h-4 [&_svg]:w-4", pressed ? "border-foreground bg-foreground text-background" : "border-glass-border bg-glass hover:bg-glass-strong")}>
      {children}
    </button>
  );
}

function ImageControls({ b, editBlock }: { b: Block; editBlock: Props["editBlock"] }) {
  const file = useRef<HTMLInputElement>(null);
  const c = b.content;
  const upload = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Choose an image file"); return; }
    if (f.size > MAX_UPLOAD) { toast.error("That photo is over 1.5 MB. Try a smaller one."); return; }
    const r = new FileReader();
    r.onload = () => editBlock(b.id, { image: String(r.result) });
    r.readAsDataURL(f);
  };
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Photo">
        {IMAGE_LIBRARY.map((img) => {
          const on = c.image === `lib:${img.key}`;
          return (
            <button key={img.key} type="button" role="radio" aria-checked={on} aria-label={img.label} onClick={() => editBlock(b.id, { image: `lib:${img.key}` })} className={cn("aspect-square overflow-hidden rounded-xl ring-offset-2 ring-offset-background", on ? "ring-[3px] ring-primary" : "ring-1 ring-glass-border hover:ring-primary/60")}>
              <img src={img.src} alt="" className="h-full w-full object-cover" />
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button variant="glass" size="sm" className="flex-1" onClick={() => file.current?.click()}><ImagePlus /> Upload photo</Button>
        {c.image && <Button variant="ghost" size="sm" onClick={() => editBlock(b.id, { image: "" })}>Remove</Button>}
        <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {c.image && !c.image.startsWith("lib:") && resolveImage(c.image) && <p className="text-xs text-muted-foreground">Using your uploaded photo.</p>}
      <Section title="Adjust">
        <label className="flex flex-col gap-1 text-xs font-semibold">Height {c.imageHeight ?? (b.type === "hero" ? 380 : 280)}px
          <input type="range" min={180} max={600} step={10} value={c.imageHeight ?? (b.type === "hero" ? 380 : 280)} onChange={(e) => editBlock(b.id, { imageHeight: +e.target.value })} className="accent-primary" />
        </label>
        {b.type === "hero" && (
          <label className="flex flex-col gap-1 text-xs font-semibold">Darken {Math.round((c.overlay ?? 0.35) * 100)}%
            <input type="range" min={0} max={90} value={Math.round((c.overlay ?? 0.35) * 100)} onChange={(e) => editBlock(b.id, { overlay: +e.target.value / 100 })} className="accent-primary" />
          </label>
        )}
        {b.type === "image" && (
          <label className="flex items-center justify-between text-xs font-semibold">Rounded corners
            <input type="checkbox" checked={!!c.rounded} onChange={(e) => editBlock(b.id, { rounded: e.target.checked })} className="h-4 w-4 accent-primary" />
          </label>
        )}
      </Section>
    </>
  );
}
