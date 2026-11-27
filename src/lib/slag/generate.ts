import { createBlock, uid } from "./blocks";
import { pickImageFor } from "./images";
import { applyTemplate } from "./templates/apply";
import type { TemplateConfig } from "./templates/schema";
import { slugify } from "./publishing";
import { getTheme, suggestThemes, POSTER_FONTS } from "./themes";
import type { Block, Campaign, DesiredAction, Purpose, WizardAnswers } from "./types";

export const PURPOSES: { id: Purpose; label: string; hint: string }[] = [
  { id: "event", label: "Promote an event", hint: "Parties, launches, workshops, gigs" },
  { id: "product", label: "Advertise a product", hint: "New arrivals, launches, drops" },
  { id: "service", label: "Promote a service", hint: "Freelance, salon, repairs, tutoring" },
  { id: "announcement", label: "Announce something", hint: "News, openings, personal moments" },
  { id: "offer", label: "Create an offer", hint: "Discounts, bundles, specials" },
  { id: "food", label: "Food & hospitality", hint: "Menus, pop-ups, restaurants" },
  { id: "other", label: "Something else", hint: "Community, causes, anything" },
];

export const ACTIONS: { id: DesiredAction; label: string; hint: string }[] = [
  { id: "contact", label: "Contact me", hint: "Opens a WhatsApp chat" },
  { id: "register", label: "Register", hint: "Opens your Google Form" },
  { id: "buy", label: "Buy", hint: "Links to your shop or WhatsApp" },
  { id: "visit", label: "Visit", hint: "Shows directions to you" },
  { id: "enquire", label: "Enquire", hint: "Opens your Google Form" },
  { id: "learn", label: "Learn more", hint: "Links to a website" },
];

export const AUDIENCES = ["Locals nearby", "Young adults", "Families", "Students", "Professionals", "Existing customers", "Everyone"];
export const TONES = ["Friendly", "Professional", "Premium", "Playful", "Energetic", "Calm"];

const KEYWORDS: [Purpose, RegExp][] = [
  ["food", /\b(coffee|cafe|café|restaurant|menu|food|bakery|brunch|dinner|lunch|kitchen|market|pop-?up|chef|braai)\b/i],
  ["event", /\b(event|party|festival|fest|concert|gig|show|workshop|wedding|birthday|conference|meetup|launch party|night|tournament|class)\b/i],
  ["offer", /\b(sale|discount|% off|percent off|special|deal|promo|bundle|black friday|clearance)\b/i],
  ["service", /\b(service|freelance|portfolio|design(er)?|salon|repair|tutor|consult|cleaning|photograph(er|y)|coach|plumb)\w*\b/i],
  ["product", /\b(product|shop|store|collection|launch|new arrival|drop|sneaker|skincare|merch)\b/i],
  ["announcement", /\b(announce|announcement|opening|news|moving|engagement|graduation|update)\b/i],
];

export function inferPurpose(text: string): Purpose | undefined {
  for (const [p, re] of KEYWORDS) if (re.test(text)) return p;
  return undefined;
}

const SMALL = new Set(["a", "an", "the", "and", "or", "of", "at", "in", "on", "for", "to", "with", "by"]);
export function inferTitle(text: string): string {
  const quoted = text.match(/["“']([^"”']{3,60})["”']/);
  if (quoted) return quoted[1].trim();
  let t = text
    .trim()
    .replace(/^(i('| a)m|we('| a)re|i want to|we want to|help me|create|make|build|promote|advertise|announce|a poster for|poster for|campaign for)\s+/i, "")
    .replace(/^(creating|making|hosting|launching|opening|running|promoting|selling|a|an|the|our|my)\s+/i, "")
    .replace(/^(a|an|the|our|my)\s+/i, "");
  t = t.split(/[.,!?\n]| on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)| this | next /i)[0];
  const words = t.split(/\s+/).filter(Boolean).slice(0, 7);
  return words
    .map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

const EYEBROWS: Record<Purpose, string> = {
  event: "You're invited",
  product: "Now available",
  service: "Now booking",
  announcement: "Announcement",
  offer: "Limited-time offer",
  food: "Now serving",
  other: "Don't miss this",
};

const TONE_SUBTITLES: Record<string, (t: string) => string> = {
  Friendly: (t) => `Come and see what ${t} is all about — we'd love to have you.`,
  Professional: (t) => `${t}: everything you need to know, in one place.`,
  Premium: (t) => `An elevated experience, thoughtfully crafted. Discover ${t}.`,
  Playful: (t) => `Good vibes only. ${t} is here and it's a whole mood.`,
  Energetic: (t) => `Big energy, bold moments. ${t} is happening — be there.`,
  Calm: (t) => `Take a breath and discover ${t}, at your own pace.`,
};

export function headlineIdeas(title: string, purpose?: Purpose, tone?: string): string[] {
  const t = title || "This";
  const base = [
    t,
    purpose === "event" ? `${t}: one night only` : `Meet ${t}`,
    tone === "Premium" ? `${t}, refined.` : `${t} is here`,
    purpose === "offer" ? `Don't miss ${t}` : `Discover ${t}`,
    purpose === "food" ? `Fresh, local & made for you` : `Made for people like you`,
    `Your next favourite thing`,
  ];
  return Array.from(new Set(base));
}

function detailsFrom(a: WizardAnswers): Block | null {
  const items: NonNullable<Block["content"]["items"]> = [];
  if (a.date) items.push({ id: uid("d"), icon: "date", label: "Date", value: a.date });
  if (a.time) items.push({ id: uid("d"), icon: "time", label: "Time", value: a.time });
  if (a.venue || a.address) items.push({ id: uid("d"), icon: "location", label: a.purpose === "event" ? "Venue" : "Where", value: a.venue || a.address || "" });
  if (a.price && a.purpose === "service") items.push({ id: uid("d"), icon: "price", label: "Pricing", value: a.price });
  if (a.validUntil) items.push({ id: uid("d"), icon: "date", label: "Valid until", value: a.validUntil });
  if (a.keyDetails) {
    a.keyDetails
      .split(/\n|;|•/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4)
      .forEach((s) => items.push({ id: uid("d"), icon: "info", label: "Good to know", value: s }));
  }
  if (a.whatsapp && a.action !== "contact") items.push({ id: uid("d"), icon: "phone", label: "Contact", value: a.whatsapp });
  if (!items.length) return null;
  return createBlock("details", { heading: a.purpose === "event" ? "The details" : "Good to know", items });
}

function ctaFrom(a: WizardAnswers): Block {
  const action = a.action ?? "contact";
  switch (action) {
    case "contact":
      return createBlock("cta", { label: "Chat with us on WhatsApp", action: "whatsapp", target: a.whatsapp ?? "", message: `Hi! I saw "${a.title}" and would like to know more.` });
    case "register":
      return createBlock("cta", { label: a.purpose === "event" ? "Reserve my spot" : "Register now", action: "form" });
    case "enquire":
      return createBlock("cta", { label: "Send an enquiry", action: "form" });
    case "buy":
      return a.url
        ? createBlock("cta", { label: "Shop now", action: "url", target: a.url })
        : createBlock("cta", { label: "Order on WhatsApp", action: "whatsapp", target: a.whatsapp ?? "", message: `Hi! I'd like to order from "${a.title}".` });
    case "visit":
      return createBlock("cta", { label: "Get directions", action: "url", target: a.address || a.venue ? `https://maps.google.com/?q=${encodeURIComponent(a.address || a.venue || "")}` : a.url ?? "" });
    case "learn":
      return createBlock("cta", { label: "Learn more", action: "url", target: a.url ?? "" });
  }
}

/**
 * Turn wizard answers into a complete, structured, editable poster document.
 * With a template, the content is the same and the template sets the look and block order.
 */
export function generateCampaign(a: WizardAnswers, template?: TemplateConfig): Campaign {
  const purpose = a.purpose ?? inferPurpose(`${a.title} ${a.description}`) ?? "other";
  const tone = a.tone ?? "Friendly";
  const themeId = !a.themeId || a.themeId === "auto" ? suggestThemes(purpose, tone)[0] : a.themeId;
  const theme = getTheme(themeId);
  const title = a.title.trim() || "Untitled campaign";
  const words = `${purpose} ${title} ${a.description} ${a.prompt ?? ""}`;

  const blocks: Block[] = [];
  const hero = createBlock("hero", {
    eyebrow: EYEBROWS[purpose],
    headline: a.headline.trim() || title,
    subtitle: a.description.trim().split(/(?<=[.!?])\s/)[0] || TONE_SUBTITLES[tone]?.(title) || "",
    image: pickImageFor(words),
  });
  if (tone === "Premium") hero.style.headingWeight = 600;
  if (tone === "Energetic" || tone === "Playful") {
    hero.style.uppercase = true;
    hero.style.headingWeight = 900;
  }
  blocks.push(hero);

  const rest = a.description.trim().split(/(?<=[.!?])\s/).slice(1).join(" ");
  const audience = a.audience.filter((x) => x !== "Everyone");
  blocks.push(
    createBlock("text", {
      heading: purpose === "event" ? "What to expect" : purpose === "service" ? "How I can help" : "About",
      body:
        rest ||
        a.description.trim() ||
        `${title} is made for ${audience.length ? audience.join(", ").toLowerCase() : "everyone"}. ${TONE_SUBTITLES[tone]?.(title) ?? ""}`,
    }),
  );

  if (a.price && purpose !== "service") {
    blocks.push(createBlock("offer", { heading: purpose === "offer" ? "This week only" : "Price", price: a.price, originalPrice: a.originalPrice ?? "", note: a.validUntil ? `Valid until ${a.validUntil}` : "While stocks last", endsAt: a.validUntil }));
  }
  const details = detailsFrom({ ...a, purpose });
  if (details) blocks.push(details);
  blocks.push(ctaFrom({ ...a, purpose, title }));
  if (a.action === "register") blocks.push(createBlock("form", { heading: "Register", body: "Complete the Google Form to reserve your spot.", submitLabel: "Reserve my spot" }));
  if (a.action === "enquire") blocks.push(createBlock("form", { heading: "Send us a message", body: "Continue to our Google Form and we'll get back to you.", submitLabel: "Send enquiry" }));
  if (purpose === "event" || purpose === "food" || purpose === "product") {
    blocks.push(createBlock("social", { heading: "Follow for updates", links: [{ id: uid("s"), platform: "instagram", url: "" }, { id: uid("s"), platform: "tiktok", url: "" }] }));
  }
  blocks.push(createBlock("footer", { text: title, small: purpose === "offer" ? "Offer subject to availability. Terms apply." : "Shared with SlagBio" }));

  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: uid("c"),
    slug: slugify(title) || uid("campaign"),
    title,
    purpose,
    status: "draft",
    visibility: "private",
    theme,
    blocks,
    createdAt: now,
    updatedAt: now,
    views: 0,
    ctaClicks: 0,
    shares: 0,
    daily: {},
    responses: [],
    payments: [],
    brief: a,
  };
  return template ? applyTemplate(campaign, template, { reorder: true }) : campaign;
}

export { POSTER_FONTS };
