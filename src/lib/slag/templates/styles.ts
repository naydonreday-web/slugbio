import type { Block, BlockContent, BlockStyle, BlockType, CtaAction, SocialPlatform } from "../types";

/**
 * Block Visual Style Registry.
 *
 * Every visual treatment a block can take, described as data so Wiby, the studio and the universal
 * renderer all read the same list. A campaign only stores a style id on `block.style.variant` (or
 * inherits the template's choice), so styles can be added here without touching any campaign document.
 */

export type ProfileId = "editorial" | "luxury" | "street" | "futuristic" | "playful" | "minimal" | "commercial" | "artistic";
export const PROFILE_IDS = ["editorial", "luxury", "street", "futuristic", "playful", "minimal", "commercial", "artistic"] as const satisfies readonly ProfileId[];

/** Blocks with more than one visual style. Text, form and social keep their single layout. */
export const STYLED_BLOCKS = ["hero", "image", "offer", "details", "cta", "footer"] as const satisfies readonly BlockType[];
export type StyledBlockType = (typeof STYLED_BLOCKS)[number];

/** Content a style needs before it can draw. Missing requirements make the renderer use the style's fallback. */
export type Requirement = "image" | "headline" | "price" | "endsAt" | "date-item" | "location-item" | "social-links" | "contact";

export const REQUIREMENT_LABELS: Record<Requirement, string> = {
  image: "a photo",
  headline: "a headline",
  price: "a price",
  endsAt: "an end date",
  "date-item": "a date in the details",
  "location-item": "a place in the details",
  "social-links": "social links on the poster",
  contact: "a WhatsApp number, phone, email or address on the poster",
};

export interface BlockVisualStyle {
  /** Stable id, `<block>.<name>`. Never rename one that has shipped — campaigns point at it. */
  id: string;
  blockType: StyledBlockType;
  name: string;
  description: string;
  /** Design characteristics Wiby reads when composing a poster. */
  characteristics: string[];
  /** Block style properties this style responds to. */
  supportedProperties: (keyof BlockStyle)[];
  requiredContent: Requirement[];
  optionalContent: (keyof BlockContent)[];
  responsive: { mobile: string; desktop: string };
  compatibility: {
    /** Style used when the required content is missing. */
    fallback?: string;
    /** Page brightness it was designed for. "any" adapts to both. */
    worksOn: "light" | "dark" | "any";
    /** Visual family — Wiby avoids putting two blocks of the same family next to each other. */
    family: string;
  };
  preview: {
    /** 1 calm – 5 loud. Wiby keeps the hero loudest so the poster has a clear hierarchy. */
    energy: 1 | 2 | 3 | 4 | 5;
    density: "airy" | "balanced" | "dense";
    tags: string[];
  };
  ai: {
    useWhen: string;
    avoidWhen: string;
    /** Words that point at this style in a chat request (regex source). */
    match: string;
  };
  /** Creative profiles this style suits. Suggestions only — Wiby can borrow across profiles. */
  profiles: ProfileId[];
}

const HEAD: (keyof BlockStyle)[] = ["align", "padding", "headingScale", "headingWeight", "uppercase", "bg", "text", "accent"];
const BOX: (keyof BlockStyle)[] = ["align", "padding", "bg", "text", "accent"];
const HERO_OPT: (keyof BlockContent)[] = ["eyebrow", "subtitle", "image", "imageHeight", "overlay"];

const s = (d: BlockVisualStyle) => d;

export const BLOCK_STYLES: BlockVisualStyle[] = [
  // ───────────── HERO ─────────────
  s({ id: "hero.cinematic", blockType: "hero", name: "Cinematic full bleed", description: "Edge-to-edge photo with the headline sitting low over a soft scrim, like a film poster.", characteristics: ["full-bleed photo", "text over image", "dramatic scrim", "big headline"], supportedProperties: HEAD, requiredContent: ["headline"], optionalContent: HERO_OPT, responsive: { mobile: "Photo fills the width, text sits in the lower half.", desktop: "Same full-bleed photo, headline grows to 84px." }, compatibility: { worksOn: "any", family: "photo-bleed" }, preview: { energy: 4, density: "balanced", tags: ["photo", "bold"] }, ai: { useWhen: "There is a strong photo and the poster should feel like an event or launch.", avoidWhen: "There is no photo, or the headline is very long.", match: "cinematic|full[- ]?bleed hero|film|movie poster|photo hero" }, profiles: ["commercial", "street", "futuristic", "playful"] }),
  s({ id: "hero.typographic", blockType: "hero", name: "Typographic", description: "No photo — a huge headline does all the work, with a short accent rule.", characteristics: ["type only", "oversized headline", "accent rule", "high impact"], supportedProperties: HEAD, requiredContent: ["headline"], optionalContent: ["eyebrow", "subtitle"], responsive: { mobile: "Headline fills the screen width and shrinks for long text.", desktop: "Headline grows up to 128px." }, compatibility: { worksOn: "any", family: "type" }, preview: { energy: 5, density: "airy", tags: ["type", "bold"] }, ai: { useWhen: "The headline is short and punchy, or there is no good photo.", avoidWhen: "The photo is the main selling point.", match: "typograph|type[- ]only|big type|just text|no photo hero|words only" }, profiles: ["street", "editorial", "minimal", "artistic"] }),
  s({ id: "hero.colour-block", blockType: "hero", name: "Colour block", description: "A solid slab of the accent colour with the headline on it and the photo framed beside it.", characteristics: ["solid accent panel", "framed photo", "graphic", "confident"], supportedProperties: HEAD, requiredContent: ["headline"], optionalContent: HERO_OPT, responsive: { mobile: "Colour panel on top, photo below.", desktop: "Text and photo side by side on the colour." }, compatibility: { worksOn: "any", family: "solid-colour" }, preview: { energy: 4, density: "balanced", tags: ["colour", "graphic"] }, ai: { useWhen: "The brand colour should lead and the poster needs to feel bold and friendly.", avoidWhen: "The accent colour is very pale.", match: "colou?r[- ]?block|solid colou?r|colou?r panel|block of colou?r" }, profiles: ["playful", "commercial", "street"] }),
  s({ id: "hero.gradient", blockType: "hero", name: "Gradient", description: "Soft glowing colour fields behind a centred headline, with an optional photo window.", characteristics: ["soft gradient", "ambient glow", "rounded photo window", "modern"], supportedProperties: HEAD, requiredContent: ["headline"], optionalContent: HERO_OPT, responsive: { mobile: "Gradient fills the block, photo window below the text.", desktop: "More room around the text, photo window stays centred." }, compatibility: { worksOn: "any", family: "gradient" }, preview: { energy: 3, density: "airy", tags: ["gradient", "soft"] }, ai: { useWhen: "The campaign is modern, digital or wellness, and you want warmth without a busy photo.", avoidWhen: "Another gradient block is already close by.", match: "gradient|glowy|ambient|aura" }, profiles: ["futuristic", "playful", "artistic"] }),
  s({ id: "hero.editorial", blockType: "hero", name: "Editorial", description: "Magazine layout — a framed photo on top and a serif-friendly headline below.", characteristics: ["photo above text", "reading order", "calm", "magazine"], supportedProperties: HEAD, requiredContent: ["headline"], optionalContent: HERO_OPT, responsive: { mobile: "Framed photo, then the text underneath.", desktop: "Wider photo, headline up to 80px." }, compatibility: { worksOn: "any", family: "photo-framed" }, preview: { energy: 3, density: "balanced", tags: ["editorial", "photo"] }, ai: { useWhen: "The story matters, the headline is longer, or the tone is professional or premium.", avoidWhen: "The poster needs to shout.", match: "editorial|magazine|newspaper|stacked" }, profiles: ["editorial", "luxury", "minimal"] }),
  s({ id: "hero.neon", blockType: "hero", name: "Neon", description: "Night-time block with a glowing headline and a faint photo behind a grid.", characteristics: ["dark backdrop", "glowing text", "grid lines", "nightlife"], supportedProperties: HEAD, requiredContent: ["headline"], optionalContent: HERO_OPT, responsive: { mobile: "Glow stays readable at every size.", desktop: "Headline grows, grid lines spread out." }, compatibility: { worksOn: "dark", family: "glow" }, preview: { energy: 5, density: "balanced", tags: ["neon", "night"] }, ai: { useWhen: "Parties, gigs, gaming or tech launches with an energetic tone.", avoidWhen: "Calm, premium or daytime campaigns.", match: "neon|glow(ing)? (hero|headline|title)|night ?life|cyber" }, profiles: ["futuristic", "street"] }),
  s({ id: "hero.split", blockType: "hero", name: "Split screen", description: "Photo on one half, text on the other — clean and balanced.", characteristics: ["two columns", "balanced", "photo + text", "clear"], supportedProperties: HEAD, requiredContent: ["headline", "image"], optionalContent: ["eyebrow", "subtitle", "imageHeight"], responsive: { mobile: "Photo on top, text panel below.", desktop: "Photo and text side by side, half each." }, compatibility: { fallback: "hero.typographic", worksOn: "any", family: "photo-split" }, preview: { energy: 3, density: "balanced", tags: ["photo", "clean"] }, ai: { useWhen: "Products, services and longer headlines where photo and words matter equally.", avoidWhen: "There is no photo.", match: "split|side[- ]by[- ]side|half and half|two columns" }, profiles: ["commercial", "minimal", "editorial", "luxury"] }),
  s({ id: "hero.collage", blockType: "hero", name: "Collage", description: "Your photo cut into three tilted crops with a colour tile — scrapbook energy.", characteristics: ["multiple crops", "tilted tiles", "layered", "handmade"], supportedProperties: HEAD, requiredContent: ["headline", "image"], optionalContent: ["eyebrow", "subtitle"], responsive: { mobile: "Text first, then a compact collage.", desktop: "Collage spreads wider and taller." }, compatibility: { fallback: "hero.colour-block", worksOn: "any", family: "collage" }, preview: { energy: 4, density: "dense", tags: ["collage", "playful"] }, ai: { useWhen: "Markets, community, food and creative events with a playful tone.", avoidWhen: "Premium or very corporate campaigns.", match: "collage|scrapbook|mood ?board|cut[- ]?out" }, profiles: ["playful", "artistic", "street"] }),
  s({ id: "hero.floating", blockType: "hero", name: "Floating image", description: "Text first, then the photo floating on a soft band with a deep shadow.", characteristics: ["floating card", "deep shadow", "slight tilt", "product shot"], supportedProperties: HEAD, requiredContent: ["headline", "image"], optionalContent: ["eyebrow", "subtitle"], responsive: { mobile: "Photo card fills most of the width.", desktop: "Photo card narrows to about 70%." }, compatibility: { fallback: "hero.colour-block", worksOn: "any", family: "photo-float" }, preview: { energy: 3, density: "balanced", tags: ["product", "photo"] }, ai: { useWhen: "Products and launches where the photo is the hero object.", avoidWhen: "Wide landscape photos of crowds.", match: "float(ing)?|levitat|product shot|card photo" }, profiles: ["commercial", "luxury", "playful"] }),
  s({ id: "hero.minimal", blockType: "hero", name: "Minimal whitespace", description: "Lots of empty space, a quiet headline and an optional slim photo strip.", characteristics: ["generous space", "quiet type", "thin rule", "restrained"], supportedProperties: HEAD, requiredContent: ["headline"], optionalContent: HERO_OPT, responsive: { mobile: "Extra breathing room above and below.", desktop: "Text keeps a narrow measure; photo strip runs full width." }, compatibility: { worksOn: "any", family: "minimal" }, preview: { energy: 1, density: "airy", tags: ["minimal", "calm"] }, ai: { useWhen: "Calm, premium, wellness or portfolio campaigns.", avoidWhen: "Loud sales or parties.", match: "minimal|whitespace|white space|quiet|simple hero|clean hero" }, profiles: ["minimal", "luxury", "editorial"] }),

  // ───────────── IMAGE ─────────────
  s({ id: "image.inset", blockType: "image", name: "Inset photo", description: "The original SlugBio photo — inside the page margins, optional rounded corners.", characteristics: ["inset", "simple", "caption below"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption", "imageHeight", "rounded"], responsive: { mobile: "Full content width.", desktop: "Full content width, same height." }, compatibility: { worksOn: "any", family: "photo-inset" }, preview: { energy: 2, density: "balanced", tags: ["classic"] }, ai: { useWhen: "Anything — the safe default.", avoidWhen: "You need a strong visual moment.", match: "inset|normal photo|plain photo" }, profiles: ["commercial", "minimal"] }),
  s({ id: "image.full-bleed", blockType: "image", name: "Full bleed", description: "Edge-to-edge photo with no margins, caption underneath.", characteristics: ["edge to edge", "immersive", "no frame"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption", "imageHeight"], responsive: { mobile: "Touches both screen edges.", desktop: "Spans the whole poster width." }, compatibility: { worksOn: "any", family: "photo-bleed" }, preview: { energy: 3, density: "balanced", tags: ["photo", "immersive"] }, ai: { useWhen: "Atmosphere shots: venues, crowds, landscapes.", avoidWhen: "Right after a full-bleed hero.", match: "full[- ]?bleed|edge to edge|full width photo" }, profiles: ["street", "commercial", "futuristic", "editorial"] }),
  s({ id: "image.framed", blockType: "image", name: "Framed", description: "Photo in a gallery mat with the caption set inside the frame.", characteristics: ["mat frame", "gallery", "caption inside"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption", "imageHeight"], responsive: { mobile: "Thin mat around the photo.", desktop: "Wider mat." }, compatibility: { worksOn: "any", family: "photo-framed" }, preview: { energy: 2, density: "balanced", tags: ["gallery", "editorial"] }, ai: { useWhen: "Art, portfolios, premium products.", avoidWhen: "Fast, loud campaigns.", match: "frame(d)?|mat|gallery frame|museum" }, profiles: ["editorial", "luxury", "artistic", "minimal"] }),
  s({ id: "image.offset", blockType: "image", name: "Offset", description: "Photo with a block of accent colour shifted behind it.", characteristics: ["offset shadow", "accent block", "graphic"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption", "imageHeight"], responsive: { mobile: "Smaller offset so nothing touches the edge.", desktop: "Larger offset." }, compatibility: { worksOn: "any", family: "solid-colour" }, preview: { energy: 3, density: "balanced", tags: ["graphic"] }, ai: { useWhen: "Adding colour and depth to an ordinary photo.", avoidWhen: "Next to another colour-block section.", match: "offset|shadow block|shifted" }, profiles: ["playful", "commercial", "street"] }),
  s({ id: "image.polaroid", blockType: "image", name: "Polaroid", description: "Instant-photo print, slightly tilted, caption in the white space.", characteristics: ["instant photo", "tilted", "handwritten feel", "nostalgic"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption"], responsive: { mobile: "Print takes most of the width.", desktop: "Print stays postcard-sized." }, compatibility: { worksOn: "any", family: "tilted" }, preview: { energy: 3, density: "balanced", tags: ["nostalgic", "playful"] }, ai: { useWhen: "Community, food, birthdays and memories.", avoidWhen: "Corporate or luxury posters.", match: "polaroid|instant photo|snapshot" }, profiles: ["playful", "artistic"] }),
  s({ id: "image.organic", blockType: "image", name: "Rounded organic", description: "Photo cropped into a soft blob shape.", characteristics: ["blob crop", "soft", "natural"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption", "imageHeight"], responsive: { mobile: "Blob fills the width.", desktop: "Blob capped near 30rem." }, compatibility: { worksOn: "any", family: "soft-shape" }, preview: { energy: 2, density: "airy", tags: ["organic", "soft"] }, ai: { useWhen: "Wellness, food, beauty, nature.", avoidWhen: "Technical or sharp-edged brands.", match: "organic|blob|soft shape|wavy" }, profiles: ["playful", "artistic", "minimal"] }),
  s({ id: "image.circular", blockType: "image", name: "Circular", description: "Round crop with an accent ring — great for people and products.", characteristics: ["circle crop", "accent ring", "focused"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption"], responsive: { mobile: "About three quarters of the width.", desktop: "Capped at 22rem." }, compatibility: { worksOn: "any", family: "soft-shape" }, preview: { energy: 2, density: "airy", tags: ["portrait"] }, ai: { useWhen: "Portraits, speakers, a single product.", avoidWhen: "Wide scenes.", match: "circ(le|ular)|round photo|portrait" }, profiles: ["minimal", "luxury", "playful"] }),
  s({ id: "image.text-overlay", blockType: "image", name: "Text overlay", description: "The caption becomes a big statement over the photo.", characteristics: ["caption on photo", "scrim", "statement"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption", "imageHeight"], responsive: { mobile: "Caption wraps over the lower half.", desktop: "Caption grows with the width." }, compatibility: { worksOn: "any", family: "photo-bleed" }, preview: { energy: 4, density: "balanced", tags: ["statement"] }, ai: { useWhen: "The caption is a short, punchy line.", avoidWhen: "There is no caption, or the hero is already text over a photo.", match: "text (on|over) (the )?(image|photo)|overlay|caption on" }, profiles: ["street", "commercial", "editorial"] }),
  s({ id: "image.collage", blockType: "image", name: "Collage", description: "One photo cut into a grid of three crops.", characteristics: ["grid crops", "rhythm", "detail shots"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption"], responsive: { mobile: "Large crop plus two small ones.", desktop: "Three-across grid." }, compatibility: { worksOn: "any", family: "collage" }, preview: { energy: 3, density: "dense", tags: ["collage"] }, ai: { useWhen: "Showing texture and detail — food, markets, crafts.", avoidWhen: "The hero is already a collage.", match: "collage|grid of photos|mosaic" }, profiles: ["artistic", "playful", "street"] }),
  s({ id: "image.duotone", blockType: "image", name: "Duotone", description: "Photo recoloured in two tones from the poster palette.", characteristics: ["two-tone", "on-brand colour", "graphic"], supportedProperties: BOX, requiredContent: [], optionalContent: ["image", "caption", "imageHeight"], responsive: { mobile: "Full content width.", desktop: "Full content width." }, compatibility: { worksOn: "any", family: "tinted" }, preview: { energy: 3, density: "balanced", tags: ["duotone", "graphic"] }, ai: { useWhen: "Photos that clash with the palette, or a bold graphic look.", avoidWhen: "Food or products where true colour matters.", match: "duo ?tone|two[- ]tone|tinted|recolou?r" }, profiles: ["futuristic", "artistic", "street", "editorial"] }),

  // ───────────── OFFER ─────────────
  s({ id: "offer.boxed", blockType: "offer", name: "Boxed promotion", description: "Price in a soft panel with the label above and the note below.", characteristics: ["panel", "clear", "centred price"], supportedProperties: HEAD, requiredContent: ["price"], optionalContent: ["heading", "originalPrice", "note"], responsive: { mobile: "Panel fills the width.", desktop: "Panel capped at 36rem." }, compatibility: { worksOn: "any", family: "boxed" }, preview: { energy: 3, density: "balanced", tags: ["classic"] }, ai: { useWhen: "Any price — the safe default.", avoidWhen: "Right after boxed details.", match: "box(ed)?|panel|card offer" }, profiles: ["commercial", "minimal", "editorial"] }),
  s({ id: "offer.burst", blockType: "offer", name: "Discount burst", description: "A spiky starburst shouting the saving, next to the price.", characteristics: ["starburst", "percentage off", "retail energy"], supportedProperties: HEAD, requiredContent: ["price"], optionalContent: ["heading", "originalPrice", "note"], responsive: { mobile: "Burst above the price.", desktop: "Burst beside the price." }, compatibility: { worksOn: "any", family: "burst" }, preview: { energy: 5, density: "balanced", tags: ["sale", "loud"] }, ai: { useWhen: "There is an old price, so the saving can be shown.", avoidWhen: "Premium or calm campaigns.", match: "burst|starburst|sale badge|% off|percent" }, profiles: ["commercial", "street", "playful"] }),
  s({ id: "offer.luxury", blockType: "offer", name: "Luxury price", description: "Fine rules, spaced capitals and a quiet price — like a boutique tag.", characteristics: ["hairline rules", "spaced capitals", "understated"], supportedProperties: HEAD, requiredContent: ["price"], optionalContent: ["heading", "originalPrice", "note"], responsive: { mobile: "Centred with generous space.", desktop: "Same, more space." }, compatibility: { worksOn: "any", family: "minimal" }, preview: { energy: 2, density: "airy", tags: ["premium"] }, ai: { useWhen: "Premium products, fine dining, high-end services.", avoidWhen: "Discounts that should shout.", match: "luxur|elegant price|premium price|boutique" }, profiles: ["luxury", "editorial", "minimal"] }),
  s({ id: "offer.countdown", blockType: "offer", name: "Countdown offer", description: "Price with a live countdown to when the offer ends.", characteristics: ["live timer", "urgency", "digits"], supportedProperties: HEAD, requiredContent: ["price", "endsAt"], optionalContent: ["heading", "originalPrice", "note"], responsive: { mobile: "Four timer boxes in a row.", desktop: "Timer and price side by side." }, compatibility: { fallback: "offer.boxed", worksOn: "any", family: "timer" }, preview: { energy: 4, density: "dense", tags: ["urgency"] }, ai: { useWhen: "The offer has an end date.", avoidWhen: "There is no end date.", match: "count ?down|timer|clock|ends in" }, profiles: ["commercial", "futuristic", "street"] }),
  s({ id: "offer.ticket", blockType: "offer", name: "Ticket offer", description: "A perforated ticket with a tear-off stub.", characteristics: ["ticket shape", "perforation", "stub"], supportedProperties: HEAD, requiredContent: ["price"], optionalContent: ["heading", "originalPrice", "note"], responsive: { mobile: "Stub tears off at the bottom.", desktop: "Stub on the right." }, compatibility: { worksOn: "any", family: "ticket" }, preview: { energy: 3, density: "balanced", tags: ["event", "ticket"] }, ai: { useWhen: "Event tickets, entry fees, vouchers.", avoidWhen: "Physical products.", match: "ticket|voucher|coupon|admit" }, profiles: ["playful", "street", "editorial", "artistic"] }),
  s({ id: "offer.sticker", blockType: "offer", name: "Floating sticker", description: "The price on a round tilted sticker stuck to the panel.", characteristics: ["round sticker", "tilt", "fun"], supportedProperties: HEAD, requiredContent: ["price"], optionalContent: ["heading", "originalPrice", "note"], responsive: { mobile: "Sticker sits above the text.", desktop: "Sticker overlaps the panel corner." }, compatibility: { worksOn: "any", family: "tilted" }, preview: { energy: 4, density: "balanced", tags: ["fun"] }, ai: { useWhen: "Short prices with a playful tone.", avoidWhen: "Long price text, premium tone.", match: "sticker|badge|stamp" }, profiles: ["playful", "street", "commercial"] }),
  s({ id: "offer.minimal", blockType: "offer", name: "Minimal price", description: "Just the price, large and light, over a hairline.", characteristics: ["no panel", "large light numerals", "hairline"], supportedProperties: HEAD, requiredContent: ["price"], optionalContent: ["heading", "originalPrice", "note"], responsive: { mobile: "Left-aligned with the page.", desktop: "Same, larger numerals." }, compatibility: { worksOn: "any", family: "minimal" }, preview: { energy: 2, density: "airy", tags: ["minimal"] }, ai: { useWhen: "Minimal or portfolio posters.", avoidWhen: "The price must shout.", match: "minimal price|simple price|just the price|clean price" }, profiles: ["minimal", "luxury", "editorial", "futuristic"] }),
  s({ id: "offer.gradient", blockType: "offer", name: "Gradient offer", description: "A glossy accent gradient card with the price in the middle.", characteristics: ["gradient card", "glossy", "accent"], supportedProperties: HEAD, requiredContent: ["price"], optionalContent: ["heading", "originalPrice", "note"], responsive: { mobile: "Card fills the width.", desktop: "Card capped at 36rem." }, compatibility: { worksOn: "any", family: "gradient" }, preview: { energy: 4, density: "balanced", tags: ["gradient"] }, ai: { useWhen: "Digital products, apps, beauty, launches.", avoidWhen: "The hero is already a gradient.", match: "gradient (offer|price|card)|glossy" }, profiles: ["futuristic", "playful", "commercial"] }),

  // ───────────── DETAILS ─────────────
  s({ id: "details.icon-list", blockType: "details", name: "Icon list", description: "Ruled rows, each with an icon, label and value.", characteristics: ["icons", "ruled rows", "scannable"], supportedProperties: HEAD, requiredContent: [], optionalContent: ["heading", "items"], responsive: { mobile: "Label and value wrap under each other.", desktop: "Label left, value right." }, compatibility: { worksOn: "any", family: "list" }, preview: { energy: 2, density: "dense", tags: ["list"] }, ai: { useWhen: "Three to six short facts.", avoidWhen: "Right after another ruled list.", match: "icon list|list with icons|rows" }, profiles: ["editorial", "commercial", "minimal"] }),
  s({ id: "details.boxed", blockType: "details", name: "Boxed details", description: "Each fact in its own card with a round icon — the original SlugBio look.", characteristics: ["cards", "round icons", "friendly"], supportedProperties: HEAD, requiredContent: [], optionalContent: ["heading", "items"], responsive: { mobile: "One card per row.", desktop: "Template sets 1–3 columns." }, compatibility: { worksOn: "any", family: "boxed" }, preview: { energy: 3, density: "balanced", tags: ["cards", "classic"] }, ai: { useWhen: "Friendly posters with a few key facts.", avoidWhen: "Right after a boxed offer.", match: "box(ed)?|cards?|tiles" }, profiles: ["commercial", "playful"] }),
  s({ id: "details.columns", blockType: "details", name: "Editorial columns", description: "Facts set in newspaper columns with vertical rules and serif values.", characteristics: ["columns", "vertical rules", "serif values"], supportedProperties: HEAD, requiredContent: [], optionalContent: ["heading", "items"], responsive: { mobile: "Two columns.", desktop: "Template sets up to three columns." }, compatibility: { worksOn: "any", family: "columns" }, preview: { energy: 2, density: "balanced", tags: ["editorial"] }, ai: { useWhen: "Editorial or premium posters with four or more facts.", avoidWhen: "Only one fact.", match: "columns?|newspaper|editorial details" }, profiles: ["editorial", "luxury", "artistic"] }),
  s({ id: "details.timeline", blockType: "details", name: "Timeline", description: "Facts along a vertical line with dots — reads like a schedule.", characteristics: ["vertical line", "dots", "sequence"], supportedProperties: HEAD, requiredContent: [], optionalContent: ["heading", "items"], responsive: { mobile: "Single line down the left.", desktop: "Same, more space between steps." }, compatibility: { worksOn: "any", family: "timeline" }, preview: { energy: 2, density: "balanced", tags: ["schedule"] }, ai: { useWhen: "Schedules, programmes, steps or line-ups.", avoidWhen: "Facts that aren't in any order.", match: "timeline|schedule|programme|agenda|line[- ]?up|steps" }, profiles: ["editorial", "futuristic", "minimal", "commercial"] }),
  s({ id: "details.minimal-list", blockType: "details", name: "Minimal list", description: "Label on the left, value on the right, dotted rule between — nothing else.", characteristics: ["no icons", "dotted leaders", "quiet"], supportedProperties: HEAD, requiredContent: [], optionalContent: ["heading", "items"], responsive: { mobile: "Label and value share a line where they fit.", desktop: "Comfortable measure." }, compatibility: { worksOn: "any", family: "minimal" }, preview: { energy: 1, density: "airy", tags: ["minimal"] }, ai: { useWhen: "Minimal and luxury posters.", avoidWhen: "The poster needs friendly icons.", match: "minimal (list|details)|simple list|menu list|no icons" }, profiles: ["minimal", "luxury"] }),
  s({ id: "details.calendar", blockType: "details", name: "Calendar card", description: "A tear-off calendar page for the date, with the other facts beside it.", characteristics: ["calendar tile", "big day number", "event"], supportedProperties: HEAD, requiredContent: ["date-item"], optionalContent: ["heading", "items"], responsive: { mobile: "Calendar on top, facts below.", desktop: "Calendar left, facts right." }, compatibility: { fallback: "details.boxed", worksOn: "any", family: "calendar" }, preview: { energy: 3, density: "balanced", tags: ["event", "date"] }, ai: { useWhen: "Events where the date is the key fact.", avoidWhen: "There is no date.", match: "calendar|date card|save the date" }, profiles: ["playful", "commercial", "street"] }),
  s({ id: "details.location", blockType: "details", name: "Location panel", description: "A map-style panel with a pin and a directions link, then the other facts.", characteristics: ["map panel", "pin", "directions"], supportedProperties: HEAD, requiredContent: ["location-item"], optionalContent: ["heading", "items"], responsive: { mobile: "Map panel on top, facts below.", desktop: "Map left, facts right." }, compatibility: { fallback: "details.icon-list", worksOn: "any", family: "map" }, preview: { energy: 3, density: "balanced", tags: ["venue", "map"] }, ai: { useWhen: "Pop-ups, shops, venues — anywhere people need to find.", avoidWhen: "There is no address or venue.", match: "map|location|directions|venue panel|where" }, profiles: ["commercial", "minimal", "playful"] }),
  s({ id: "details.grid", blockType: "details", name: "Technical grid", description: "A ruled spec-sheet grid with numbered cells.", characteristics: ["ruled grid", "numbered cells", "spec sheet"], supportedProperties: HEAD, requiredContent: [], optionalContent: ["heading", "items"], responsive: { mobile: "Two cells per row.", desktop: "Template sets up to three per row." }, compatibility: { worksOn: "any", family: "grid" }, preview: { energy: 2, density: "dense", tags: ["technical"] }, ai: { useWhen: "Tech, products with specs, many short facts.", avoidWhen: "Long values.", match: "grid|spec|technical|table" }, profiles: ["futuristic", "editorial", "street"] }),

  // ───────────── CTA ─────────────
  s({ id: "cta.solid", blockType: "cta", name: "Solid button", description: "A full accent button — the original SlugBio call to action.", characteristics: ["solid fill", "large target", "clear"], supportedProperties: BOX, requiredContent: [], optionalContent: ["label", "action", "target"], responsive: { mobile: "Full width, at least 56px tall.", desktop: "Capped at 28rem." }, compatibility: { worksOn: "any", family: "button" }, preview: { energy: 3, density: "balanced", tags: ["classic"] }, ai: { useWhen: "Any poster — the safe default.", avoidWhen: "Never wrong, but can be plain.", match: "solid|filled button|normal button" }, profiles: ["commercial", "playful", "minimal"] }),
  s({ id: "cta.outline", blockType: "cta", name: "Outline button", description: "A bordered button with no fill — light and precise.", characteristics: ["outline", "light", "precise"], supportedProperties: BOX, requiredContent: [], optionalContent: ["label", "action", "target"], responsive: { mobile: "Full width.", desktop: "Capped at 28rem." }, compatibility: { worksOn: "any", family: "outline" }, preview: { energy: 2, density: "airy", tags: ["minimal"] }, ai: { useWhen: "Minimal, editorial or premium posters.", avoidWhen: "The button must be the loudest thing on screen.", match: "outline|bordered|ghost button|hollow" }, profiles: ["minimal", "editorial", "luxury"] }),
  s({ id: "cta.pill", blockType: "cta", name: "Pill button", description: "A compact ink-coloured pill with the action icon in an accent circle.", characteristics: ["pill", "compact", "icon badge"], supportedProperties: BOX, requiredContent: [], optionalContent: ["label", "action", "target"], responsive: { mobile: "Sized to its label.", desktop: "Sized to its label." }, compatibility: { worksOn: "any", family: "button" }, preview: { energy: 3, density: "balanced", tags: ["modern"] }, ai: { useWhen: "Modern, app-like posters.", avoidWhen: "Very long button labels.", match: "pill|capsule|rounded button" }, profiles: ["playful", "futuristic", "commercial"] }),
  s({ id: "cta.arrow", blockType: "cta", name: "Arrow link", description: "A big underlined link with an arrow — no box at all.", characteristics: ["text link", "arrow", "understated"], supportedProperties: BOX, requiredContent: [], optionalContent: ["label", "action", "target"], responsive: { mobile: "Label wraps, arrow stays beside it.", desktop: "Larger label." }, compatibility: { worksOn: "any", family: "link" }, preview: { energy: 2, density: "airy", tags: ["editorial"] }, ai: { useWhen: "Editorial, portfolio and luxury posters.", avoidWhen: "Visitors need an obvious big button.", match: "arrow|link style|text link|underlined" }, profiles: ["editorial", "minimal", "luxury", "artistic"] }),
  s({ id: "cta.bar", blockType: "cta", name: "Full-width bar", description: "An edge-to-edge accent bar with the label on the left and an arrow on the right.", characteristics: ["edge to edge", "bar", "bold"], supportedProperties: BOX, requiredContent: [], optionalContent: ["label", "action", "target"], responsive: { mobile: "Touches both screen edges.", desktop: "Spans the whole poster." }, compatibility: { worksOn: "any", family: "bar" }, preview: { energy: 4, density: "balanced", tags: ["bold"] }, ai: { useWhen: "Street, sales and loud event posters.", avoidWhen: "Quiet or luxury posters.", match: "bar|full[- ]width button|banner button|strip" }, profiles: ["street", "commercial", "futuristic"] }),
  s({ id: "cta.floating", blockType: "cta", name: "Floating action", description: "A pill that floats at the bottom of the screen while visitors scroll.", characteristics: ["sticky", "always visible", "shadow"], supportedProperties: BOX, requiredContent: [], optionalContent: ["label", "action", "target"], responsive: { mobile: "Floats above the bottom edge.", desktop: "Same, centred." }, compatibility: { worksOn: "any", family: "floating" }, preview: { energy: 3, density: "balanced", tags: ["sticky"] }, ai: { useWhen: "Long posters where the action should always be one tap away.", avoidWhen: "There are several buttons — only one should float.", match: "float(ing)? button|sticky|always visible|fab" }, profiles: ["commercial", "futuristic", "playful"] }),
  s({ id: "cta.glow", blockType: "cta", name: "Glow button", description: "An accent button with a soft pulsing halo.", characteristics: ["halo", "pulse", "energetic"], supportedProperties: BOX, requiredContent: [], optionalContent: ["label", "action", "target"], responsive: { mobile: "Full width.", desktop: "Capped at 28rem." }, compatibility: { worksOn: "dark", family: "glow" }, preview: { energy: 5, density: "balanced", tags: ["neon"] }, ai: { useWhen: "Dark, energetic, nightlife or tech posters.", avoidWhen: "Light calm posters, or right after a neon hero is fine but not two glows in a row.", match: "glow|halo|pulse|neon button" }, profiles: ["futuristic", "street"] }),
  s({ id: "cta.editorial", blockType: "cta", name: "Editorial CTA", description: "The label set like a headline between fine rules, with an arrow.", characteristics: ["headline-sized", "rules", "serif-friendly"], supportedProperties: BOX, requiredContent: [], optionalContent: ["label", "action", "target"], responsive: { mobile: "Label up to 36px.", desktop: "Label up to 52px." }, compatibility: { worksOn: "any", family: "link" }, preview: { energy: 3, density: "airy", tags: ["editorial"] }, ai: { useWhen: "Editorial, luxury and artistic posters.", avoidWhen: "Long labels.", match: "editorial (button|cta)|headline button|magazine button" }, profiles: ["editorial", "luxury", "artistic"] }),

  // ───────────── FOOTER ─────────────
  s({ id: "footer.minimal", blockType: "footer", name: "Minimal footer", description: "Name and small print over a hairline — the original SlugBio footer.", characteristics: ["hairline", "small", "quiet"], supportedProperties: BOX, requiredContent: [], optionalContent: ["text", "small"], responsive: { mobile: "Stacked.", desktop: "Stacked." }, compatibility: { worksOn: "any", family: "minimal" }, preview: { energy: 1, density: "airy", tags: ["classic"] }, ai: { useWhen: "Any poster.", avoidWhen: "Never wrong.", match: "minimal footer|simple footer|plain footer" }, profiles: ["minimal", "commercial", "editorial"] }),
  s({ id: "footer.social", blockType: "footer", name: "Social row", description: "Name and small print with the poster's social icons in a row.", characteristics: ["icons", "row", "follow"], supportedProperties: BOX, requiredContent: ["social-links"], optionalContent: ["text", "small"], responsive: { mobile: "Icons under the text.", desktop: "Text left, icons right." }, compatibility: { fallback: "footer.minimal", worksOn: "any", family: "icons" }, preview: { energy: 2, density: "balanced", tags: ["social"] }, ai: { useWhen: "The poster has social links.", avoidWhen: "There are no social links.", match: "social (row|footer|icons)|follow footer" }, profiles: ["playful", "street", "commercial"] }),
  s({ id: "footer.signature", blockType: "footer", name: "Brand signature", description: "The name set huge as a closing wordmark.", characteristics: ["wordmark", "oversized", "brand"], supportedProperties: BOX, requiredContent: [], optionalContent: ["text", "small"], responsive: { mobile: "Wordmark fills the width.", desktop: "Wordmark up to 120px." }, compatibility: { worksOn: "any", family: "type" }, preview: { energy: 4, density: "airy", tags: ["brand"] }, ai: { useWhen: "Short brand names, street and fashion posters.", avoidWhen: "The hero is already huge type, or the name is long.", match: "signature|wordmark|brand footer|big name" }, profiles: ["street", "luxury", "artistic", "futuristic"] }),
  s({ id: "footer.qr", blockType: "footer", name: "QR code panel", description: "A scannable QR code for this poster beside the name.", characteristics: ["QR code", "share", "print-friendly"], supportedProperties: BOX, requiredContent: [], optionalContent: ["text", "small"], responsive: { mobile: "QR beside the text.", desktop: "QR beside the text, more space." }, compatibility: { worksOn: "any", family: "qr" }, preview: { energy: 2, density: "balanced", tags: ["share"] }, ai: { useWhen: "Posters that will also be shown on screens or printed.", avoidWhen: "Never harmful.", match: "qr|scan" }, profiles: ["futuristic", "commercial", "minimal"] }),
  s({ id: "footer.contact", blockType: "footer", name: "Contact card", description: "A card with every way to reach you, pulled from the poster.", characteristics: ["card", "contact rows", "practical"], supportedProperties: BOX, requiredContent: ["contact"], optionalContent: ["text", "small"], responsive: { mobile: "Rows stacked.", desktop: "Rows in two columns." }, compatibility: { fallback: "footer.minimal", worksOn: "any", family: "boxed" }, preview: { energy: 2, density: "dense", tags: ["contact"] }, ai: { useWhen: "Services and shops with a phone, WhatsApp, email or address.", avoidWhen: "There is no contact detail on the poster.", match: "contact (card|footer|details)|how to reach" }, profiles: ["commercial", "minimal", "editorial"] }),
  s({ id: "footer.closing", blockType: "footer", name: "Closing statement", description: "The footer text as a big closing line with an accent quote mark.", characteristics: ["statement", "large type", "emotional"], supportedProperties: BOX, requiredContent: [], optionalContent: ["text", "small"], responsive: { mobile: "Statement up to 36px.", desktop: "Statement up to 64px." }, compatibility: { worksOn: "any", family: "statement" }, preview: { energy: 3, density: "airy", tags: ["statement"] }, ai: { useWhen: "Causes, announcements, events with a memorable sign-off.", avoidWhen: "The footer text is just terms and conditions.", match: "closing|statement|sign[- ]?off|quote" }, profiles: ["artistic", "editorial", "luxury", "playful"] }),
];

/** Old template variant names → style ids, so templates saved before the style registry keep rendering the same. */
export const STYLE_ALIASES: Record<StyledBlockType, Record<string, string>> = {
  hero: { default: "hero.cinematic", overlay: "hero.cinematic", stacked: "hero.editorial" },
  image: { default: "image.inset" },
  offer: { default: "offer.boxed" },
  details: { default: "details.boxed", cards: "details.boxed", list: "details.icon-list" },
  cta: { default: "cta.solid" },
  footer: { default: "footer.minimal" },
};

const BY_ID = new Map(BLOCK_STYLES.map((x) => [x.id, x]));

export function isStyledBlock(t: BlockType): t is StyledBlockType {
  return (STYLED_BLOCKS as readonly string[]).includes(t);
}

export function stylesFor(t: BlockType): BlockVisualStyle[] {
  return BLOCK_STYLES.filter((x) => x.blockType === t);
}

export function getStyle(id: string | undefined | null): BlockVisualStyle | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Turns an alias or style id into a registered style id for that block, or undefined. */
export function canonicalStyleId(t: BlockType, v: string | undefined | null): string | undefined {
  if (!v || !isStyledBlock(t)) return undefined;
  const alias = STYLE_ALIASES[t][v];
  if (alias) return alias;
  const st = BY_ID.get(v);
  return st && st.blockType === t ? st.id : undefined;
}

export function defaultStyleId(t: BlockType): string | undefined {
  return isStyledBlock(t) ? STYLE_ALIASES[t].default : undefined;
}

/** Every value a template may put in `blocks.<type>.variant`: legacy names first, then style ids. */
export function variantNames(t: BlockType): [string, ...string[]] {
  if (!isStyledBlock(t)) return ["default"];
  return [...Object.keys(STYLE_ALIASES[t]), ...stylesFor(t).map((x) => x.id)] as [string, ...string[]];
}

/** Facts about the whole poster that some styles draw on (social row, contact card, QR panel). */
export interface StyleContext {
  links: { id: string; platform: SocialPlatform; url: string }[];
  contacts: { id: string; kind: CtaAction | "location"; value: string }[];
  url: string;
}

export function styleContext(blocks: Block[], slug?: string, publicOrigin?: string): StyleContext {
  const links = blocks.filter((b) => b.type === "social").flatMap((b) => b.content.links ?? []);
  const contacts: StyleContext["contacts"] = [];
  const seen = new Set<string>();
  const add = (kind: StyleContext["contacts"][number]["kind"], value: string | undefined, id: string) => {
    const v = (value ?? "").trim();
    if (!v || seen.has(`${kind}:${v}`)) return;
    seen.add(`${kind}:${v}`);
    contacts.push({ id, kind, value: v });
  };
  for (const b of blocks) {
    if (b.type === "cta" && (b.content.action === "whatsapp" || b.content.action === "phone" || b.content.action === "email")) add(b.content.action, b.content.target, b.id);
    if (b.type === "details") for (const it of b.content.items ?? []) {
      if (it.icon === "phone") add("phone", it.value, it.id);
      if (it.icon === "location") add("location", it.value, it.id);
    }
  }
  const origin = publicOrigin ?? import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://slug.bio";
  return { links, contacts, url: `${origin.replace(/\/$/, "")}/c/${slug || "your-campaign"}` };
}

export function parseEndsAt(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime()) && /\b\d{4}\b/.test(v)) return d;

  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const monthPattern = monthNames.flatMap((month) => [month, month.slice(0, 3)]).join("|");
  const dayFirst = v.toLowerCase().match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})\\b`));
  const monthFirst = v.toLowerCase().match(new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  const match = dayFirst ?? monthFirst;
  if (!match) return Number.isNaN(d.getTime()) ? null : d;

  const monthToken = dayFirst ? match[2] : match[1];
  const month = monthNames.findIndex((name) => name.startsWith(monthToken));
  const day = Number(dayFirst ? match[1] : match[2]);
  const suppliedYear = v.match(/\b(20\d{2})\b/)?.[1];
  const makeDate = (year: number) => new Date(year, month, day, 23, 59, 59, 999);
  if (suppliedYear) {
    const end = makeDate(Number(suppliedYear));
    return end.getMonth() === month && end.getDate() === day ? end : null;
  }
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year <= currentYear + 8; year++) {
    const end = makeDate(year);
    if (end.getMonth() === month && end.getDate() === day && end.getTime() > Date.now()) return end;
  }
  return null;
}

function has(b: Block, r: Requirement, ctx: StyleContext): boolean {
  const c = b.content;
  switch (r) {
    case "image": return !!c.image;
    case "headline": return true; // always drawable — an empty headline shows its placeholder in the editor
    case "price": return !!c.price?.trim();
    case "endsAt": return !!parseEndsAt(c.endsAt);
    case "date-item": return (c.items ?? []).some((i) => i.icon === "date" && i.value.trim());
    case "location-item": return (c.items ?? []).some((i) => i.icon === "location" && i.value.trim());
    case "social-links": return ctx.links.length > 0;
    case "contact": return ctx.contacts.length > 0;
  }
}

export function missingRequirements(st: BlockVisualStyle, b: Block, ctx: StyleContext): Requirement[] {
  return st.requiredContent.filter((r) => !has(b, r, ctx));
}

export interface ResolvedStyle {
  /** The style that actually draws. */
  style: BlockVisualStyle;
  /** The style that was asked for, when a fallback replaced it. */
  requested?: BlockVisualStyle;
  missing: Requirement[];
}

/**
 * Which style draws this block: the block's own choice, else the template's, else the block default —
 * then follow fallbacks until the content meets the style's requirements.
 */
export function resolveBlockStyle(b: Block, templateVariant: string | undefined, ctx: StyleContext): ResolvedStyle | null {
  if (!isStyledBlock(b.type)) return null;
  const want = getStyle(canonicalStyleId(b.type, b.style.variant) ?? canonicalStyleId(b.type, templateVariant) ?? defaultStyleId(b.type))!;
  let st = want;
  let missing = missingRequirements(st, b, ctx);
  const firstMissing = missing;
  for (let i = 0; i < 4 && missing.length && st.compatibility.fallback; i++) {
    st = getStyle(st.compatibility.fallback)!;
    missing = missingRequirements(st, b, ctx);
  }
  return st === want
    ? { style: st, missing }
    : { style: st, requested: want, missing: firstMissing };
}

/** Plain-data snapshot of the style registry, stored next to the block registry for Wiby and admins. */
export function styleRegistrySnapshot() {
  return BLOCK_STYLES.map(({ ai, ...rest }) => ({ ...rest, ai: { useWhen: ai.useWhen, avoidWhen: ai.avoidWhen } }));
}
