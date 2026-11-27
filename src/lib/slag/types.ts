export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "offer"
  | "details"
  | "cta"
  | "form"
  | "social"
  | "footer";

export type Align = "left" | "center";
export type CtaAction = "whatsapp" | "url" | "form" | "phone" | "email";
export type DetailIcon = "date" | "time" | "location" | "phone" | "price" | "info";
export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "x" | "whatsapp" | "website";
export type FieldType = "text" | "email" | "tel" | "textarea" | "select";

export interface BlockStyle {
  bg?: string; // overrides theme background
  text?: string; // overrides theme text colour
  accent?: string; // overrides theme accent
  align: Align;
  padding: number; // vertical padding in px
  headingScale: number; // 0.7 – 1.8
  headingWeight: number; // 400 – 900
  uppercase?: boolean;
  /** Visual style id from the block style registry (e.g. "hero.neon"). Missing = the template's choice. */
  variant?: string;
  /** Per-element formatting, keyed by the element inside the block (headline, button, …). */
  elements?: Partial<Record<ElementKey, ElementStyle>>;
}

/** A single editable piece inside a block: a text, the button or the photo. */
export type ElementKey =
  | "eyebrow" | "headline" | "subtitle" | "heading" | "body" | "image" | "caption"
  | "price" | "originalPrice" | "note" | "label" | "submitLabel" | "text" | "small";

export interface ElementStyle {
  font?: PosterFont; // overrides the theme font
  bold?: boolean; // undefined = the element's default weight
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface BlockContent {
  eyebrow?: string;
  headline?: string;
  subtitle?: string;
  heading?: string;
  body?: string;
  image?: string; // "lib:<key>" | url | data url
  imageHeight?: number;
  overlay?: number; // 0 – 0.9
  caption?: string;
  rounded?: boolean;
  // offer
  price?: string;
  originalPrice?: string;
  note?: string;
  /** When the offer ends (ISO date or date-time); drives the countdown style. */
  endsAt?: string;
  // details
  items?: { id: string; icon: DetailIcon; label: string; value: string }[];
  // cta
  label?: string;
  action?: CtaAction;
  target?: string;
  message?: string;
  // form
  googleFormUrl?: string;
  fields?: FormField[];
  submitLabel?: string;
  successMessage?: string;
  // social
  links?: { id: string; platform: SocialPlatform; url: string }[];
  // footer
  text?: string;
  small?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  content: BlockContent;
  style: BlockStyle;
}

export type PosterFont = "jakarta" | "fraunces" | "bricolage";

export interface Theme {
  id: string;
  name: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  font: PosterFont;
  /** Headline font set by a template; falls back to `font`. */
  displayFont?: PosterFont;
  radius: number;
}

/** Points a campaign at the template that controls its presentation. Content stays in the campaign. */
export interface TemplateRef {
  id: string;
  version: string;
}

export type Purpose =
  | "event"
  | "product"
  | "service"
  | "announcement"
  | "offer"
  | "food"
  | "other";

export type DesiredAction = "contact" | "register" | "buy" | "visit" | "enquire" | "learn";

export interface WizardAnswers {
  prompt?: string;
  purpose?: Purpose;
  title: string;
  headline: string;
  description: string;
  date?: string;
  time?: string;
  venue?: string;
  price?: string;
  originalPrice?: string;
  validUntil?: string;
  keyDetails?: string;
  audience: string[];
  audienceNote?: string;
  tone?: string;
  action?: DesiredAction;
  whatsapp?: string;
  url?: string;
  address?: string;
  email?: string;
  themeId?: string; // "auto" lets AI decide
  /** A template Wiby designed for this campaign; overrides themeId when set. */
  templateRef?: TemplateRef & { name: string };
}

export interface FormResponse {
  id: string;
  submittedAt: string;
  values: Record<string, string>;
}

export type StoredStatus = "draft" | "published" | "archived";
export type CampaignStatus = "draft" | "scheduled" | "active" | "expired" | "archived";

export interface Payment {
  id: string;
  amount: number;
  vat: number;
  total: number;
  method: string;
  paidAt: string;
  durationDays: number;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  purpose: Purpose;
  status: StoredStatus;
  visibility: "private" | "public";
  theme: Theme;
  /** Presentation template; missing means the built-in Classic layout. */
  template?: TemplateRef;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
  startsAt?: string;
  expiresAt?: string;
  durationDays?: number;
  expiredMessage?: string;
  expiredContact?: string;
  views: number;
  ctaClicks: number;
  shares: number;
  daily: Record<string, { views: number; clicks: number; responses: number }>;
  responses: FormResponse[];
  payments: Payment[];
  brief?: WizardAnswers;
}

export interface HistoryEntry {
  id: string;
  label: string;
  source: "ai" | "you";
  at: string;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  changes?: string[];
  at: string;
}
