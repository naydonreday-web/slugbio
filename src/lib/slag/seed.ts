import { createBlock, uid } from "./blocks";
import { getTheme } from "./themes";
import type { Block, Campaign } from "./types";

const DAY = 86400000;

function daily(days: number, end: Date, peak: number) {
  const out: Campaign["daily"] = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY);
    const k = d.toISOString().slice(0, 10);
    const wave = Math.round(peak * (0.45 + 0.55 * Math.sin(((days - i) / days) * Math.PI)));
    out[k] = { views: wave, clicks: Math.round(wave * 0.17), responses: Math.round(wave * 0.05) };
  }
  return out;
}

function base(partial: Partial<Campaign> & Pick<Campaign, "title" | "slug" | "purpose" | "theme" | "blocks">): Campaign {
  const now = new Date().toISOString();
  return {
    id: uid("c"),
    status: "draft",
    visibility: "private",
    createdAt: now,
    updatedAt: now,
    views: 0,
    ctaClicks: 0,
    shares: 0,
    daily: {},
    responses: [],
    payments: [],
    ...partial,
  };
}

function neonBlocks(): Block[] {
  const hero = createBlock("hero", { eyebrow: "Live · Open air · 18+", headline: "Neon Sunset Music Fest", subtitle: "Twelve artists. One golden-hour stage. The longest night of summer.", image: "lib:neon", imageHeight: 420, overlay: 0.4 });
  hero.style = { ...hero.style, headingWeight: 900, uppercase: true, headingScale: 1.25 };
  return [
    hero,
    createBlock("details", {
      heading: "The details",
      items: [
        { id: uid("d"), icon: "date", label: "Date", value: "Saturday, 19 December 2026" },
        { id: uid("d"), icon: "time", label: "Gates", value: "16:00 until late" },
        { id: uid("d"), icon: "location", label: "Venue", value: "Maseru Club Grounds" },
      ],
    }),
    createBlock("offer", { heading: "Early bird tickets", price: "M250", originalPrice: "M350", note: "Until 10 December or while they last" }),
    createBlock("cta", { label: "Book tickets on WhatsApp", action: "whatsapp", target: "+266 5800 1234", message: "Hi! I'd like to book tickets for Neon Sunset Music Fest." }),
    createBlock("form", { heading: "Join the guest list", body: "Get set times and secret-stage drops before anyone else.", submitLabel: "Put me on the list", successMessage: "You're on the list! Watch your WhatsApp for set times." }),
    createBlock("social", { heading: "Follow the lineup", links: [ { id: uid("s"), platform: "instagram", url: "https://instagram.com/neonsunsetfest" }, { id: uid("s"), platform: "tiktok", url: "https://tiktok.com/@neonsunsetfest" } ] }),
    createBlock("footer", { text: "Neon Sunset Music Fest 2026", small: "Strictly 18+. ID required at the gate." }),
  ];
}

function coffeeBlocks(): Block[] {
  const hero = createBlock("hero", { eyebrow: "Pop-up · Three days only", headline: "Artisan Coffee Roasters", subtitle: "Small-batch beans roasted on site. Pour-overs, cold brew and fresh pastries.", image: "lib:coffee", imageHeight: 380, overlay: 0.3 });
  hero.style = { ...hero.style, headingWeight: 600, headingScale: 1.15 };
  return [
    hero,
    createBlock("text", { heading: "Slow coffee, done right", body: "We're bringing our roastery to Kingsway for one long weekend. Taste single-origin flights, meet the roasters, and take home a bag ground exactly how you like it." }),
    createBlock("offer", { heading: "Opening weekend", price: "2 for M60", originalPrice: "", note: "Any two pour-overs, all weekend" }),
    createBlock("details", {
      heading: "Find us",
      items: [
        { id: uid("d"), icon: "date", label: "Dates", value: "Fri – Sun, 4–6 December" },
        { id: uid("d"), icon: "time", label: "Hours", value: "07:00 – 15:00" },
        { id: uid("d"), icon: "location", label: "Where", value: "Kingsway Arcade, Maseru" },
      ],
    }),
    createBlock("cta", { label: "Get directions", action: "url", target: "https://maps.google.com/?q=Kingsway+Maseru" }),
    createBlock("footer", { text: "Artisan Coffee Roasters", small: "Roasted with care in Lesotho" }),
  ];
}

function designerBlocks(): Block[] {
  const hero = createBlock("hero", { eyebrow: "Available from January", headline: "Product design that people actually enjoy using", subtitle: "I'm Lerato — a freelance product designer helping startups ship clear, beautiful apps.", image: "lib:designer", imageHeight: 320, overlay: 0.1 });
  hero.style = { ...hero.style, align: "left", headingScale: 1, headingWeight: 800 };
  return [
    hero,
    createBlock("text", { heading: "What I do", body: "UX research, product strategy, interface design and design systems. I work in focused two-week sprints so you see progress fast." }),
    createBlock("details", {
      heading: "Working together",
      items: [
        { id: uid("d"), icon: "price", label: "Sprints from", value: "M18,000 / 2 weeks" },
        { id: uid("d"), icon: "info", label: "Recent clients", value: "Fintech, health, e-commerce" },
        { id: uid("d"), icon: "location", label: "Based in", value: "Maseru · Remote worldwide" },
      ],
    }),
    createBlock("cta", { label: "Send me an enquiry", action: "form" }),
    createBlock("form", { heading: "Tell me about your project", body: "I reply within one working day.", fields: [ { id: uid("f"), label: "Your name", type: "text", required: true }, { id: uid("f"), label: "Email", type: "email", required: true }, { id: uid("f"), label: "Budget", type: "select", required: false, options: ["Under M20k", "M20k – M50k", "M50k+"] }, { id: uid("f"), label: "Project details", type: "textarea", required: false } ], submitLabel: "Send enquiry", successMessage: "Thanks! I'll be in touch within a day." }),
    createBlock("social", { heading: "Elsewhere", links: [ { id: uid("s"), platform: "website", url: "https://dribbble.com" }, { id: uid("s"), platform: "instagram", url: "" } ] }),
    createBlock("footer", { text: "Lerato M. — Product Designer", small: "Portfolio available on request" }),
  ];
}

function marketBlocks(): Block[] {
  const hero = createBlock("hero", { eyebrow: "Every Saturday", headline: "Weekend Farmers Market", subtitle: "Fresh produce, local makers and live music — straight from the people who grow it.", image: "lib:market", imageHeight: 380, overlay: 0.3 });
  hero.style = { ...hero.style, headingWeight: 800 };
  return [
    hero,
    createBlock("text", { heading: "Over 40 local stalls", body: "Heirloom vegetables, raw honey, sourdough, handmade soap and the best breakfast rolls in town. Bring a basket and your appetite." }),
    createBlock("details", {
      heading: "Market hours",
      items: [
        { id: uid("d"), icon: "date", label: "When", value: "Saturdays in October" },
        { id: uid("d"), icon: "time", label: "Hours", value: "08:00 – 13:00" },
        { id: uid("d"), icon: "location", label: "Where", value: "Victoria Park, Maseru" },
      ],
    }),
    createBlock("cta", { label: "Ask about a stall", action: "whatsapp", target: "+266 6200 4455", message: "Hi! I'd like to book a stall at the Weekend Farmers Market." }),
    createBlock("footer", { text: "Weekend Farmers Market", small: "Rain or shine" }),
  ];
}

/** Seed campaigns spread across Active, Scheduled, Draft and Expired. */
export function buildSeedCampaigns(nowDate = new Date()): Campaign[] {
  const now = nowDate.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const neonStart = now - 6 * DAY;
  const marketStart = now - 35 * DAY;

  const neon = base({
    title: "Neon Sunset Music Fest", slug: "neon-sunset-fest", purpose: "event", theme: getTheme("sunset-neon"), blocks: neonBlocks(),
    status: "published", visibility: "public", startsAt: iso(neonStart), expiresAt: iso(neonStart + 14 * DAY), durationDays: 14,
    createdAt: iso(neonStart - 2 * DAY), updatedAt: iso(neonStart - DAY), views: 1284, ctaClicks: 212, shares: 48,
    daily: daily(7, nowDate, 230),
    payments: [{ id: uid("pay"), amount: 89, vat: 13.35, total: 102.35, method: "M-Pesa", paidAt: iso(neonStart - DAY), durationDays: 14 }],
  });
  const coffeeStart = now + 2 * DAY;
  const coffee = base({
    title: "Artisan Coffee Roasters Pop-up", slug: "artisan-coffee-popup", purpose: "food", theme: getTheme("warm-kraft"), blocks: coffeeBlocks(),
    status: "published", visibility: "private", startsAt: iso(coffeeStart), expiresAt: iso(coffeeStart + 7 * DAY), durationDays: 7,
    createdAt: iso(now - 3 * DAY), updatedAt: iso(now - DAY),
    payments: [{ id: uid("pay"), amount: 49, vat: 7.35, total: 56.35, method: "Card", paidAt: iso(now - DAY), durationDays: 7 }],
  });

  const designer = base({
    title: "Freelance Product Designer Portfolio", slug: "lerato-designs", purpose: "service", theme: getTheme("studio-mono"), blocks: designerBlocks(),
    createdAt: iso(now - 2 * 3600000), updatedAt: iso(now - 3600000),
  });

  const market = base({
    title: "Weekend Farmers Market", slug: "weekend-farmers-market", purpose: "food", theme: getTheme("fresh-market"), blocks: marketBlocks(),
    status: "published", visibility: "public", startsAt: iso(marketStart), expiresAt: iso(marketStart + 30 * DAY), durationDays: 30,
    createdAt: iso(marketStart - 3 * DAY), updatedAt: iso(marketStart - DAY), views: 3920, ctaClicks: 341, shares: 102,
    daily: daily(30, new Date(marketStart + 30 * DAY), 190),
    expiredMessage: "Thanks for an amazing October season! The market returns in spring.",
    expiredContact: "+266 6200 4455",
    payments: [{ id: uid("pay"), amount: 149, vat: 22.35, total: 171.35, method: "EcoCash", paidAt: iso(marketStart - DAY), durationDays: 30 }],
  });

  return [neon, coffee, designer, market];
}

/** Template starting points for the wizard: same documents, reset as fresh drafts. */
export const TEMPLATE_SLUGS = ["neon-sunset-fest", "artisan-coffee-popup", "lerato-designs", "weekend-farmers-market"];

export function templateCampaigns(): Campaign[] {
  return buildSeedCampaigns().map((c) => ({
    ...c,
    status: "draft",
    visibility: "private",
    startsAt: undefined,
    expiresAt: undefined,
    durationDays: undefined,
    views: 0,
    ctaClicks: 0,
    shares: 0,
    daily: {},
    responses: [],
    payments: [],
  }));
}

export const SEED_META: Record<string, { title: string; description: string }> = {
  "neon-sunset-fest": { title: "Neon Sunset Music Fest", description: "Twelve artists. One golden-hour stage. The longest night of summer." },
  "artisan-coffee-popup": { title: "Artisan Coffee Roasters Pop-up", description: "Small-batch beans roasted on site. Pour-overs, cold brew and fresh pastries." },
  "lerato-designs": { title: "Freelance Product Designer Portfolio", description: "Product design that people actually enjoy using." },
  "weekend-farmers-market": { title: "Weekend Farmers Market", description: "Fresh produce, local makers and live music." },
};
