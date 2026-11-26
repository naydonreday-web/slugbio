import type { Purpose, PosterFont } from "../types";
import type { ProfileId, StyledBlockType } from "./styles";

/**
 * Creative Style Profiles — overall visual directions Wiby can design in. A profile suggests tokens and
 * block styles, but Wiby blends a second profile and lets content pull in styles from outside both,
 * so posters never look stamped from one kit.
 */
export interface CreativeProfile {
  id: ProfileId;
  name: string;
  description: string;
  characteristics: string[];
  /** Words in the brief that point at this direction (regex source). */
  keywords: string;
  tones: string[];
  purposes: Purpose[];
  /** Profiles that blend well with this one. */
  pairsWith: ProfileId[];
  tokens: {
    /** Chance of a dark page, 0–1. */
    dark: number;
    display: PosterFont[];
    body: PosterFont;
    headingWeight: number;
    headingCase: "none" | "uppercase" | "either";
    tracking: "tight" | "normal" | "wide";
    eyebrow: "pill" | "text";
    surface: ("filled" | "outline" | "plain")[];
    radius: number[];
    width: "narrow" | "regular" | "wide";
    dividers: boolean;
    /** Accent saturation range, percent. */
    saturation: [number, number];
    /** Preferred accent hue when the brief doesn't name a colour. */
    hue?: number;
    detailsColumns: 1 | 2 | 3;
  };
  /** Suggested styles per block, best first. */
  styles: Record<StyledBlockType, string[]>;
  /** Template names Wiby uses for this direction. */
  names: string[];
}

export const CREATIVE_PROFILES: CreativeProfile[] = [
  {
    id: "editorial",
    name: "Editorial",
    description:
      "Magazine and newspaper thinking — strong reading order, serif headlines, rules and columns.",
    characteristics: ["serif headlines", "ruled sections", "photo above text", "quiet buttons"],
    keywords:
      "magazine|editorial|story|article|journal|book|literary|newsletter|talk|lecture|exhibition|launch of",
    tones: ["professional", "calm"],
    purposes: ["announcement", "service"],
    pairsWith: ["minimal", "luxury", "artistic"],
    tokens: {
      dark: 0.15,
      display: ["fraunces"],
      body: "jakarta",
      headingWeight: 600,
      headingCase: "none",
      tracking: "tight",
      eyebrow: "text",
      surface: ["outline", "plain"],
      radius: [0, 4],
      width: "narrow",
      dividers: true,
      saturation: [55, 75],
      hue: 8,
      detailsColumns: 2,
    },
    styles: {
      hero: ["hero.editorial", "hero.typographic", "hero.split", "hero.minimal"],
      image: ["image.framed", "image.full-bleed", "image.duotone", "image.text-overlay"],
      offer: ["offer.luxury", "offer.minimal", "offer.ticket", "offer.boxed"],
      details: ["details.columns", "details.icon-list", "details.timeline", "details.grid"],
      cta: ["cta.editorial", "cta.arrow", "cta.outline"],
      footer: ["footer.closing", "footer.minimal", "footer.contact"],
    },
    names: ["Gazette", "Column", "Broadside", "Folio"],
  },
  {
    id: "luxury",
    name: "Luxury",
    description:
      "Boutique restraint — deep or cream pages, fine rules, spaced capitals and lots of space.",
    characteristics: ["deep or cream palette", "fine hairlines", "spaced capitals", "slow rhythm"],
    keywords:
      "luxur|premium|elegant|exclusive|gala|wedding|fine dining|jewel|boutique|couture|vip|gold|black tie|wine",
    tones: ["premium", "calm"],
    purposes: ["product", "food", "event"],
    pairsWith: ["minimal", "editorial"],
    tokens: {
      dark: 0.6,
      display: ["fraunces"],
      body: "jakarta",
      headingWeight: 500,
      headingCase: "none",
      tracking: "wide",
      eyebrow: "text",
      surface: ["outline", "plain"],
      radius: [0, 2],
      width: "narrow",
      dividers: true,
      saturation: [35, 55],
      hue: 42,
      detailsColumns: 2,
    },
    styles: {
      hero: ["hero.minimal", "hero.editorial", "hero.floating", "hero.split"],
      image: ["image.framed", "image.circular", "image.full-bleed"],
      offer: ["offer.luxury", "offer.minimal"],
      details: ["details.minimal-list", "details.columns", "details.timeline"],
      cta: ["cta.outline", "cta.editorial", "cta.arrow"],
      footer: ["footer.signature", "footer.closing", "footer.minimal"],
    },
    names: ["Maison", "Atelier", "Reserve", "Velvet"],
  },
  {
    id: "street",
    name: "Street",
    description: "Wheat-paste poster energy — loud type, hard edges, full-bleed photos and bars.",
    characteristics: ["oversized capitals", "hard edges", "high contrast", "loud colour"],
    keywords:
      "street|urban|sneaker|skate|hip ?hop|graffiti|drop|merch|streetwear|rap|battle|underground|block party",
    tones: ["energetic", "playful"],
    purposes: ["event", "product"],
    pairsWith: ["futuristic", "playful", "artistic"],
    tokens: {
      dark: 0.55,
      display: ["bricolage"],
      body: "jakarta",
      headingWeight: 800,
      headingCase: "uppercase",
      tracking: "tight",
      eyebrow: "pill",
      surface: ["filled", "outline"],
      radius: [0, 4],
      width: "wide",
      dividers: false,
      saturation: [85, 100],
      detailsColumns: 2,
    },
    styles: {
      hero: ["hero.typographic", "hero.cinematic", "hero.collage", "hero.colour-block"],
      image: ["image.full-bleed", "image.text-overlay", "image.duotone", "image.offset"],
      offer: ["offer.burst", "offer.sticker", "offer.ticket"],
      details: ["details.grid", "details.calendar", "details.icon-list"],
      cta: ["cta.bar", "cta.solid", "cta.glow"],
      footer: ["footer.signature", "footer.social"],
    },
    names: ["Wheatpaste", "Blockparty", "Flyposter", "Siren"],
  },
  {
    id: "futuristic",
    name: "Futuristic",
    description: "Screens and signals — dark pages, glowing accents, gradients, grids and timers.",
    characteristics: ["dark page", "glow", "gradients", "technical grid"],
    keywords:
      "tech|future|ai\\b|app|digital|crypto|game|gaming|esport|cyber|launch|startup|electronic|edm|rave|space|robot|code|hackathon",
    tones: ["energetic", "professional"],
    purposes: ["product", "event", "announcement"],
    pairsWith: ["street", "minimal"],
    tokens: {
      dark: 0.9,
      display: ["jakarta", "bricolage"],
      body: "jakarta",
      headingWeight: 700,
      headingCase: "either",
      tracking: "tight",
      eyebrow: "pill",
      surface: ["outline", "filled"],
      radius: [999, 12, 6],
      width: "regular",
      dividers: false,
      saturation: [80, 100],
      hue: 190,
      detailsColumns: 3,
    },
    styles: {
      hero: ["hero.neon", "hero.gradient", "hero.cinematic", "hero.typographic"],
      image: ["image.duotone", "image.full-bleed", "image.offset"],
      offer: ["offer.countdown", "offer.gradient", "offer.minimal"],
      details: ["details.grid", "details.timeline", "details.icon-list"],
      cta: ["cta.glow", "cta.pill", "cta.floating", "cta.bar"],
      footer: ["footer.qr", "footer.signature", "footer.social"],
    },
    names: ["Signal", "Pulse", "Orbit", "Circuit"],
  },
  {
    id: "playful",
    name: "Playful",
    description:
      "Bright, friendly and a bit messy — colour blocks, stickers, polaroids and round shapes.",
    characteristics: ["bright colour", "tilted shapes", "rounded corners", "friendly"],
    keywords:
      "kids|children|birthday|party|fun|play|toy|ice ?cream|sweet|candy|picnic|festival|fair|craft|pet|family|market|carnival",
    tones: ["playful", "friendly", "energetic"],
    purposes: ["event", "food", "offer", "other"],
    pairsWith: ["artistic", "commercial", "street"],
    tokens: {
      dark: 0.15,
      display: ["bricolage"],
      body: "jakarta",
      headingWeight: 800,
      headingCase: "either",
      tracking: "tight",
      eyebrow: "pill",
      surface: ["filled"],
      radius: [999, 24, 18],
      width: "regular",
      dividers: false,
      saturation: [75, 95],
      detailsColumns: 2,
    },
    styles: {
      hero: ["hero.colour-block", "hero.collage", "hero.floating", "hero.gradient"],
      image: ["image.polaroid", "image.organic", "image.offset", "image.circular"],
      offer: ["offer.sticker", "offer.ticket", "offer.burst", "offer.gradient"],
      details: ["details.calendar", "details.boxed", "details.location"],
      cta: ["cta.pill", "cta.solid", "cta.floating"],
      footer: ["footer.social", "footer.closing"],
    },
    names: ["Confetti", "Lollipop", "Jamboree", "Pop"],
  },
  {
    id: "minimal",
    name: "Minimal",
    description:
      "Space as the main material — quiet type, hairlines, no decoration that isn't needed.",
    characteristics: ["whitespace", "light weights", "hairlines", "monochrome with one accent"],
    keywords:
      "minimal|simple|clean|calm|wellness|yoga|spa|portfolio|architect|studio|meditation|therapy|consult",
    tones: ["calm", "professional", "premium"],
    purposes: ["service", "announcement", "product"],
    pairsWith: ["luxury", "editorial", "futuristic"],
    tokens: {
      dark: 0.2,
      display: ["jakarta", "fraunces"],
      body: "jakarta",
      headingWeight: 500,
      headingCase: "none",
      tracking: "normal",
      eyebrow: "text",
      surface: ["plain", "outline"],
      radius: [0, 8, 999],
      width: "narrow",
      dividers: true,
      saturation: [25, 55],
      detailsColumns: 1,
    },
    styles: {
      hero: ["hero.minimal", "hero.split", "hero.typographic", "hero.editorial"],
      image: ["image.inset", "image.circular", "image.framed", "image.organic"],
      offer: ["offer.minimal", "offer.luxury", "offer.boxed"],
      details: ["details.minimal-list", "details.timeline", "details.location"],
      cta: ["cta.outline", "cta.arrow", "cta.solid"],
      footer: ["footer.minimal", "footer.qr", "footer.contact"],
    },
    names: ["Quiet", "Linen", "Margin", "Still"],
  },
  {
    id: "commercial",
    name: "Commercial",
    description:
      "Built to sell — clear photo, obvious price, strong buttons and practical details.",
    characteristics: ["clear hierarchy", "big price", "solid buttons", "practical info"],
    keywords:
      "sale|discount|shop|store|deal|special|promo|order|buy|delivery|stock|price|bundle|retail|salon|repair|restaurant|menu",
    tones: ["friendly", "professional", "energetic"],
    purposes: ["offer", "product", "food", "service"],
    pairsWith: ["playful", "minimal", "street"],
    tokens: {
      dark: 0.2,
      display: ["jakarta"],
      body: "jakarta",
      headingWeight: 800,
      headingCase: "none",
      tracking: "normal",
      eyebrow: "pill",
      surface: ["filled"],
      radius: [999, 14, 10],
      width: "regular",
      dividers: false,
      saturation: [75, 95],
      hue: 10,
      detailsColumns: 3,
    },
    styles: {
      hero: ["hero.cinematic", "hero.split", "hero.floating", "hero.colour-block"],
      image: ["image.inset", "image.full-bleed", "image.offset"],
      offer: ["offer.burst", "offer.countdown", "offer.boxed", "offer.sticker"],
      details: ["details.boxed", "details.location", "details.icon-list", "details.calendar"],
      cta: ["cta.solid", "cta.floating", "cta.bar", "cta.pill"],
      footer: ["footer.contact", "footer.qr", "footer.social"],
    },
    names: ["Shopfront", "Spotlight", "Marquee", "Counter"],
  },
  {
    id: "artistic",
    name: "Artistic",
    description: "Gallery and studio — unexpected crops, duotones, collages and expressive type.",
    characteristics: ["unexpected crops", "duotone", "collage", "expressive"],
    keywords:
      "art|gallery|exhibit|creative|design|music|poetry|theatre|dance|film|photograph|painting|craft|handmade|studio",
    tones: ["playful", "calm", "premium"],
    purposes: ["event", "service", "announcement"],
    pairsWith: ["editorial", "playful", "street"],
    tokens: {
      dark: 0.4,
      display: ["fraunces", "bricolage"],
      body: "jakarta",
      headingWeight: 700,
      headingCase: "either",
      tracking: "tight",
      eyebrow: "text",
      surface: ["plain", "outline", "filled"],
      radius: [0, 24, 999],
      width: "wide",
      dividers: false,
      saturation: [55, 90],
      detailsColumns: 2,
    },
    styles: {
      hero: ["hero.collage", "hero.typographic", "hero.gradient", "hero.floating"],
      image: ["image.duotone", "image.collage", "image.organic", "image.framed"],
      offer: ["offer.ticket", "offer.luxury", "offer.sticker"],
      details: ["details.columns", "details.timeline", "details.grid"],
      cta: ["cta.editorial", "cta.arrow", "cta.pill"],
      footer: ["footer.closing", "footer.signature", "footer.social"],
    },
    names: ["Canvas", "Studio", "Fresco", "Monotype"],
  },
];

export const PROFILE_LABELS = Object.fromEntries(
  CREATIVE_PROFILES.map((profile) => [profile.id, profile.name]),
) as Record<ProfileId, string>;

const BY_ID = new Map(CREATIVE_PROFILES.map((p) => [p.id, p]));
export function getProfile(id: ProfileId): CreativeProfile {
  return BY_ID.get(id) ?? CREATIVE_PROFILES[0];
}
