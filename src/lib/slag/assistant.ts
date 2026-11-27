import { BLOCK_META, cloneBlock, createBlock, insertIndex } from "./blocks";
import { headlineIdeas } from "./generate";
import { nextImage, pickImageFor } from "./images";
import { getTheme, parseColor, themeFromBackground, isDark } from "./themes";
import { elementMeta, setElementStyle } from "./elements";
import type { Block, BlockType, Campaign, ElementKey, ElementStyle } from "./types";
import { missingRequirements, styleContext, stylesFor, type BlockVisualStyle } from "./templates/styles";

export interface AssistantResult {
  campaign: Campaign | null;
  reply: string;
  changes: string[];
  selectId?: string | null;
  command?: "undo" | "redo";
}

export const QUICK_SUGGESTIONS = [
  "Make headline bolder",
  "Change background to dark green",
  "Add a WhatsApp contact button",
  "Add a registration form",
  "Make more mobile-friendly",
];

export const MORE_SUGGESTIONS = [
  "Make this look more premium",
  "Rewrite the headline",
  "Replace the hero image",
  "Improve the spacing",
  "Use a serif font",
];

const BLOCK_WORDS: [BlockType, RegExp][] = [
  ["form", /\b(form|registration|sign[- ]?up|rsvp|guest list)\b/],
  ["cta", /\b(button|cta|call to action)\b/],
  ["image", /\b(image|photo|picture|gallery)\b/],
  ["offer", /\b(offer|discount|price|deal|promo)\b/],
  ["details", /\b(details|schedule|venue|info(rmation)? block|date and time)\b/],
  ["social", /\b(social|instagram|facebook|tiktok|links)\b/],
  ["footer", /\bfooter\b/],
  ["text", /\b(text|paragraph|section|description|about)\b/],
  ["hero", /\bhero\b/],
];

function quoted(s: string): string | null {
  const m = s.match(/["“'‘]([^"”'’]+)["”'’]/);
  return m ? m[1].trim() : null;
}

function afterTo(s: string): string | null {
  const m = s.match(/\b(?:to|say|says|read|reads)\s*:?\s+(.+)$/i);
  return m ? m[1].trim().replace(/[.]$/, "") : null;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function interpret(input: string, current: Campaign, selectedId: string | null): AssistantResult {
  const raw = input.trim();
  const s = raw.toLowerCase();
  const c: Campaign = JSON.parse(JSON.stringify(current));
  const changes: string[] = [];
  const selected = c.blocks.find((b) => b.id === selectedId) ?? null;
  const hero = c.blocks.find((b) => b.type === "hero") ?? null;
  const targetsThis = /\b(this|selected|current)\b/.test(s) && !!selected;
  const done = (reply: string, selectId?: string | null): AssistantResult => ({ campaign: c, reply, changes, selectId });

  if (!raw) return { campaign: null, reply: "Tell me what you'd like to change.", changes: [] };
  if (/^(undo|go back|revert)( that| last( change)?)?\.?$/.test(s)) return { campaign: null, reply: "Undone.", changes: [], command: "undo" };
  if (/^redo\.?$/.test(s)) return { campaign: null, reply: "Redone.", changes: [], command: "redo" };

  // ---------- BLOCK VISUAL STYLES ----------
  if (/\b(style|variant|layout)\b/.test(s)) {
    const explicitType = BLOCK_WORDS.find(([, re]) => re.test(s))?.[0];
    const target = explicitType ? c.blocks.find((b) => b.type === explicitType) : selected;
    const available: BlockVisualStyle[] = target ? stylesFor(target.type) : [];
    const chosen = available.find((style) => {
      const terms = [style.id, style.name].map((term) => term.toLowerCase());
      let aiMatch = false;
      try { aiMatch = new RegExp(style.ai.match, "i").test(s); } catch { /* ignore invalid catalog expression */ }
      return aiMatch || terms.some((term) => s.includes(term) || term.split(/[.\s-]+/).some((word) => word.length > 3 && new RegExp(`\\b${word}\\b`).test(s)));
    });
    if (target && chosen) {
      target.style.variant = chosen.id;
      changes.push(`${BLOCK_META[target.type].label} style → ${chosen.name}`);
      const missing = missingRequirements(chosen, target, styleContext(c.blocks));
      const requirementNote = missing.length ? ` This style needs ${missing.join(", ")}; it will use its fallback until you add that content.` : "";
      return done(`Changed the ${BLOCK_META[target.type].label.toLowerCase()} to ${chosen.name}.${requirementNote}`, target.id);
    }
    if (target) return done(`I couldn't match that to a ${BLOCK_META[target.type].label.toLowerCase()} style. Choose one in the Style control on the right.`);
  }

  // ---------- ADD BLOCKS ----------
  if (/\b(add|insert|include|put|append|create)\b/.test(s)) {
    let type: BlockType | null = null;
    if (/whats ?app/.test(s)) type = "cta";
    else for (const [t, re] of BLOCK_WORDS) if (re.test(s)) { type = t; break; }
    if (type) {
      let block: Block;
      const number = c.brief?.whatsapp ?? c.blocks.find((b) => b.content.action === "whatsapp")?.content.target ?? "";
      if (type === "cta" && /whats ?app/.test(s)) {
        block = createBlock("cta", { label: "Chat with us on WhatsApp", action: "whatsapp", target: number, message: `Hi! I saw "${c.title}" and would like to know more.` });
      } else if (type === "cta") {
        const label = quoted(raw);
        block = createBlock("cta", { label: label ?? "Learn more", action: /form|register/.test(s) ? "form" : "url", target: "" });
      } else if (type === "form") {
        const enquiry = /\b(enquir|inquir|contact|question|message|quote)/.test(s);
        block = createBlock("form", enquiry
          ? { heading: "Send us a message", body: "Continue to our Google Form and we'll get back to you.", submitLabel: "Send enquiry" }
          : { heading: "Register", body: "Complete the Google Form to reserve your spot.", submitLabel: "Register now" });
      } else if (type === "image") {
        block = createBlock("image", { image: pickImageFor(`${c.purpose} ${c.title} ${s}`) });
      } else {
        block = createBlock(type);
      }
      let idx: number;
      if (/\b(top|beginning|start)\b/.test(s)) idx = hero ? 1 : 0;
      else if (/\b(after|below|under) (this|it|the selected)\b/.test(s) && selected) idx = c.blocks.indexOf(selected) + 1;
      else if (type === "footer") idx = c.blocks.length;
      else idx = insertIndex(c.blocks, /\bbottom|end\b/.test(s) ? null : type === "cta" || type === "form" ? null : selectedId);
      c.blocks.splice(idx, 0, block);
      changes.push(`Added ${BLOCK_META[block.type].label.toLowerCase()} block`);
      if (type === "form" && !c.blocks.some((b) => b.type === "cta" && b.content.action === "form")) {
        const btn = createBlock("cta", { label: block.content.submitLabel === "Send enquiry" ? "Send an enquiry" : "Register now", action: "form" });
        const h = c.blocks.findIndex((b) => b.type === "hero");
        let at = h >= 0 ? h + 1 : 0;
        if (c.blocks[at] && (c.blocks[at].type === "text" || c.blocks[at].type === "details")) at += 1;
        c.blocks.splice(at, 0, btn);
        changes.push("Added a button that jumps to the form");
      }
      if (block.type === "cta" && block.content.action === "whatsapp" && !block.content.target) {
        return done("Added a WhatsApp button. Add your WhatsApp number in the panel on the right so it opens a chat with you.", block.id);
      }
      return done(`Done — I added a ${BLOCK_META[block.type].label.toLowerCase()} block${type === "form" ? ". Select it and paste its Google Forms responder link before publishing" : ""}. It's selected so you can fine-tune it.`, block.id);
    }
  }

  // ---------- REMOVE / MOVE / DUPLICATE ----------
  if (/\b(remove|delete|get rid of|drop)\b/.test(s)) {
    let target: Block | undefined = targetsThis ? selected! : undefined;
    if (!target) for (const [t, re] of BLOCK_WORDS) if (re.test(s)) { target = [...c.blocks].reverse().find((b) => b.type === t); break; }
    if (!target && selected) target = selected;
    if (target) {
      c.blocks = c.blocks.filter((b) => b.id !== target!.id);
      changes.push(`Removed ${BLOCK_META[target.type].label.toLowerCase()} block`);
      return done(`Removed the ${BLOCK_META[target.type].label.toLowerCase()} block.`, null);
    }
  }
  if (/\b(move|shift)\b.*\b(up|higher|down|lower|top|bottom)\b/.test(s)) {
    let target: Block | undefined = selected ?? undefined;
    for (const [t, re] of BLOCK_WORDS) if (re.test(s)) { target = c.blocks.find((b) => b.type === t); break; }
    if (target) {
      const i = c.blocks.indexOf(target);
      c.blocks.splice(i, 1);
      let j = i;
      if (/\btop\b/.test(s)) j = hero && target.type !== "hero" ? 1 : 0;
      else if (/\bbottom\b/.test(s)) j = insertIndex(c.blocks, null);
      else if (/\b(up|higher)\b/.test(s)) j = Math.max(0, i - 1);
      else j = Math.min(c.blocks.length, i + 1);
      c.blocks.splice(j, 0, target);
      changes.push(`Moved ${BLOCK_META[target.type].label.toLowerCase()} block`);
      return done(`Moved the ${BLOCK_META[target.type].label.toLowerCase()} block.`, target.id);
    }
  }
  if (/\bduplicate|copy\b/.test(s) && selected) {
    const copy = cloneBlock(selected);
    c.blocks.splice(c.blocks.indexOf(selected) + 1, 0, copy);
    changes.push(`Duplicated ${BLOCK_META[selected.type].label.toLowerCase()} block`);
    return done("Duplicated it right below the original.", copy.id);
  }

  // ---------- STYLE PRESETS ----------
  const presets: [RegExp, string, string][] = [
    [/\b(premium|luxur|elegant|classy|high[- ]end|sophisticated)/, "midnight-gold", "a premium black-and-gold look with an editorial serif"],
    [/\b(neon|party|vibrant|nightlife|electric)/, "sunset-neon", "a vibrant neon sunset palette"],
    [/\b(playful|fun|bright|colou?rful|cheerful)/, "citrus-pop", "a bright, playful citrus palette"],
    [/\b(warm|rustic|cozy|cosy|earthy|vintage)/, "warm-kraft", "a warm kraft-paper palette"],
    [/\b(fresh|natural|organic|green theme)/, "fresh-market", "a fresh, natural palette"],
    [/\b(calm|corporate|professional|trustworthy)/, "ocean-teal", "a calm, professional teal palette"],
    [/\b(modern|minimal|clean|simple)/, "studio-mono", "a clean, modern monochrome look"],
  ];
  if (/\b(look|feel|style|theme|vibe|design|make (it|this)|more)\b/.test(s) && !/\b(headline|title|button|image|font|spacing|mobile)\b/.test(s)) {
    for (const [re, id, desc] of presets) {
      if (re.test(s)) {
        const t = getTheme(id);
        c.theme = { ...t };
        c.blocks.forEach((b) => { delete b.style.bg; delete b.style.text; delete b.style.accent; });
        if (id === "midnight-gold" && hero) { hero.style.headingWeight = 500; hero.style.uppercase = false; hero.style.headingScale = Math.max(hero.style.headingScale, 1.15); }
        if (id === "citrus-pop" && hero) hero.style.headingWeight = 900;
        changes.push(`Applied "${t.name}" theme`);
        return done(`I gave the whole poster ${desc}. All your content stayed the same — only the styling changed.`);
      }
    }
  }

  // ---------- COLOURS ----------
  const color = parseColor(raw);
  if (/\b(background|bg|backdrop)\b/.test(s)) {
    const pick = color ?? (/\bdark\b/.test(s) ? { name: "dark", hex: "#141416" } : /\blight|white\b/.test(s) ? { name: "light", hex: "#fbf8f2" } : null);
    if (pick) {
      if (targetsThis || /\b(block|section)\b/.test(s)) {
        const b = selected ?? hero;
        if (b) {
          b.style.bg = pick.hex;
          b.style.text = isDark(pick.hex) ? "#f5f2ea" : "#141414";
          changes.push(`${BLOCK_META[b.type].label} background → ${pick.name}`);
          return done(`Changed the ${BLOCK_META[b.type].label.toLowerCase()} background to ${pick.name}.`, b.id);
        }
      }
      c.theme = themeFromBackground(c.theme, pick.hex);
      c.blocks.forEach((b) => { delete b.style.bg; delete b.style.text; });
      changes.push(`Poster background → ${pick.name}`);
      return done(`Changed the background to ${pick.name} and adjusted the text colours so everything stays readable.`);
    }
  }
  if (color && /\b(accent|button|highlight|brand|primary)\b/.test(s)) {
    c.theme.accent = color.hex;
    c.theme.accentText = isDark(color.hex) ? "#ffffff" : "#141414";
    changes.push(`Accent colour → ${color.name}`);
    return done(`Buttons and highlights are now ${color.name}.`);
  }
  if (color && /\b(text|font|headline|title|heading|copy) colou?r\b|\b(text|headline|title|heading) (to |in )?\b/.test(s)) {
    const b = targetsThis ? selected! : null;
    if (b) { b.style.text = color.hex; changes.push(`${BLOCK_META[b.type].label} text → ${color.name}`); return done(`The ${BLOCK_META[b.type].label.toLowerCase()} text is now ${color.name}.`, b.id); }
    c.theme.text = color.hex;
    changes.push(`Text colour → ${color.name}`);
    return done(`Text colour updated to ${color.name}.`);
  }
  if (color && /\b(make|change|turn|set|colou?r)\b/.test(s)) {
    if (selected && targetsThis) { selected.style.bg = color.hex; selected.style.text = isDark(color.hex) ? "#f5f2ea" : "#141414"; changes.push(`${BLOCK_META[selected.type].label} background → ${color.name}`); return done(`Made that block ${color.name}.`, selected.id); }
    c.theme.accent = color.hex;
    c.theme.accentText = isDark(color.hex) ? "#ffffff" : "#141414";
    changes.push(`Accent colour → ${color.name}`);
    return done(`I used ${color.name} as the accent colour for buttons and highlights. Say "background ${color.name}" if you meant the whole poster.`);
  }

  // ---------- TYPOGRAPHY ----------
  const headTarget = (selected && /\b(this|selected)\b/.test(s)) ? selected : hero ?? selected;
  if (/\b(serif|editorial)\b/.test(s) && !/sans/.test(s)) { c.theme.font = "fraunces"; delete c.theme.displayFont; changes.push("Font → Editorial serif"); return done("Switched the poster to an editorial serif font."); }
  if (/\b(sans|modern font|clean font)\b/.test(s)) { c.theme.font = "jakarta"; delete c.theme.displayFont; changes.push("Font → Modern sans"); return done("Switched to a clean, modern sans-serif."); }
  if (/\b(grotesque|chunky|bold font|display font)\b/.test(s)) { c.theme.font = "bricolage"; delete c.theme.displayFont; changes.push("Font → Bold grotesque"); return done("Switched to a bold display grotesque."); }

  if (/\b(headline|title|heading)\b/.test(s) && headTarget) {
    const field: "headline" | "heading" = headTarget.type === "hero" ? "headline" : "heading";
    const explicit = quoted(raw) ?? (/\b(change|set|make|rename)\b.*\bto\b/.test(s) && !/\b(bold|big|small|caps|upper)/.test(s) ? afterTo(raw) : null);
    if (explicit) {
      headTarget.content[field] = explicit;
      changes.push(`Headline → "${explicit}"`);
      return done(`Updated the headline to "${explicit}".`, headTarget.id);
    }
    let touched = false;
    const phrases: string[] = [];
    if (/\b(bold|bolder|heavier|thicker|stronger)\b/.test(s)) { headTarget.style.headingWeight = clamp(headTarget.style.headingWeight + 200, 400, 900); touched = true; phrases.push("bolder"); changes.push(`Headline weight → ${headTarget.style.headingWeight}`); }
    if (/\b(light|lighter|thinner)\b/.test(s)) { headTarget.style.headingWeight = clamp(headTarget.style.headingWeight - 200, 300, 900); touched = true; phrases.push("lighter"); changes.push(`Headline weight → ${headTarget.style.headingWeight}`); }
    if (/\b(big|bigger|larger|huge|prominent|stand out|pop)\b/.test(s)) { headTarget.style.headingScale = clamp(+(headTarget.style.headingScale + 0.2).toFixed(2), 0.7, 1.8); touched = true; phrases.push("bigger"); changes.push(`Headline size → ${Math.round(headTarget.style.headingScale * 100)}%`); }
    if (/\b(small|smaller|subtle)\b/.test(s)) { headTarget.style.headingScale = clamp(+(headTarget.style.headingScale - 0.15).toFixed(2), 0.7, 1.8); touched = true; phrases.push("smaller"); changes.push(`Headline size → ${Math.round(headTarget.style.headingScale * 100)}%`); }
    if (/\b(upper ?case|all caps|capitals|caps)\b/.test(s)) { headTarget.style.uppercase = !/\b(no|remove|without)\b/.test(s); touched = true; phrases.push(headTarget.style.uppercase ? "in capitals" : "in sentence case"); changes.push(headTarget.style.uppercase ? "Headline in capitals" : "Headline in sentence case"); }
    if (/\b(rewrite|reword|new|different|catchier|better|improve|shorter|punchier)\b/.test(s)) {
      const ideas = headlineIdeas(c.title, c.purpose, c.brief?.tone).filter((h) => h !== headTarget.content[field]);
      const pick = /shorter/.test(s) ? ideas.sort((a, b) => a.length - b.length)[0] : ideas[Math.floor(Math.random() * ideas.length)];
      headTarget.content[field] = pick;
      changes.push(`Headline → "${pick}"`);
      return done(`How about "${pick}"? Ask again for another option, or click the headline to type your own.`, headTarget.id);
    }
    if (touched) {
      if (/prominent|stand out|pop/.test(s) && headTarget.style.headingWeight < 800) { headTarget.style.headingWeight = 800; changes.push("Headline weight → 800"); }
      return done(`Made the headline ${phrases.join(" and ")}. Use the Typography controls on the right to fine-tune it.`, headTarget.id);
    }
  }

  // ---------- IMAGES ----------
  if (/\b(image|photo|picture)\b/.test(s) && /\b(replace|change|swap|new|different|another)\b/.test(s)) {
    const target = (selected && (selected.type === "image" || selected.type === "hero")) ? selected : hero ?? c.blocks.find((b) => b.type === "image");
    if (target) {
      const m = s.match(/\b(?:of|with|showing)\s+(.+)$/);
      target.content.image = m ? pickImageFor(m[1]) : nextImage(target.content.image);
      changes.push(`Replaced ${BLOCK_META[target.type].label.toLowerCase()} image`);
      return done("Swapped in a new image. You can also upload your own from the panel on the right.", target.id);
    }
  }
  if (/\b(remove|hide|no)\b.*\bimage\b/.test(s) && hero) {
    hero.content.image = "";
    changes.push("Removed hero image");
    return done("Removed the hero image for a clean, type-only header.", hero.id);
  }

  // ---------- LAYOUT ----------
  if (/\bmobile\b/.test(s)) {
    c.blocks.forEach((b) => {
      if (b.style.padding > 48) b.style.padding = 44;
      if (b.style.padding < 24) b.style.padding = 24;
      if (b.type === "hero") { b.style.headingScale = clamp(b.style.headingScale, 0.9, 1.3); b.content.imageHeight = Math.min(b.content.imageHeight ?? 360, 340); }
      if (b.type === "cta") b.style.align = "center";
      if (b.type === "image") b.content.imageHeight = Math.min(b.content.imageHeight ?? 280, 260);
    });
    changes.push("Balanced spacing for small screens", "Capped hero size so the message shows above the fold", "Centred buttons for easy tapping");
    const firstCta = c.blocks.findIndex((b) => b.type === "cta");
    const heroIdx = c.blocks.findIndex((b) => b.type === "hero");
    if (firstCta > heroIdx + 2) {
      const [cta] = c.blocks.splice(firstCta, 1);
      c.blocks.splice(heroIdx + 2, 0, cta);
      changes.push("Moved the main button higher up");
    }
    return done("I tuned the poster for phones: tighter spacing, a shorter hero and an easy-to-reach main button.");
  }
  if (/\b(spacing|space|breathing room|padding|airy|cramped|tight|compact)\b/.test(s)) {
    const less = /\b(less|tighter|compact|reduce|smaller)\b/.test(s);
    const list = targetsThis ? [selected!] : c.blocks;
    list.forEach((b) => { b.style.padding = clamp(b.style.padding + (less ? -12 : 12), 12, 120); });
    changes.push(less ? "Reduced spacing" : "Increased spacing");
    return done(less ? "Tightened the spacing so more fits on screen." : "Added more breathing room between sections.");
  }
  if (/\b(cent(er|re)|left)\b/.test(s) && /\b(align|text|everything|content|cent(er|re)d?)\b/.test(s)) {
    const align = /\bleft\b/.test(s) ? "left" : "center";
    const list = targetsThis || selected ? [selected ?? hero!] : c.blocks;
    list.filter(Boolean).forEach((b) => (b.style.align = align));
    changes.push(`Alignment → ${align}`);
    return done(`Aligned ${list.length > 1 ? "everything" : "that block"} ${align === "left" ? "to the left" : "to the centre"}.`);
  }
  if (/\b(round(er)?|pill)\b.*\bbutton|button.*\b(round|pill)/.test(s)) { c.theme.radius = 999; changes.push("Buttons → pill shape"); return done("Buttons are now fully rounded pills."); }
  if (/\b(square|sharp)\b/.test(s)) { c.theme.radius = 4; changes.push("Corners → sharp"); return done("Switched to sharper corners for a crisper look."); }

  // ---------- COPY ----------
  if (/\bbutton\b/.test(s) && /\b(text|label|say|read|change|rename)\b/.test(s)) {
    const btn = selected?.type === "cta" ? selected : c.blocks.find((b) => b.type === "cta");
    const label = quoted(raw) ?? afterTo(raw);
    if (btn && label) { btn.content.label = label; changes.push(`Button → "${label}"`); return done(`The button now says "${label}".`, btn.id); }
  }
  if (/\b(shorter|concise|shorten|trim|less text)\b/.test(s)) {
    let n = 0;
    c.blocks.forEach((b) => {
      if (b.content.body && b.content.body.split(/(?<=[.!?])\s/).length > 1) { b.content.body = b.content.body.split(/(?<=[.!?])\s/)[0]; n++; }
      if (b.type === "hero" && b.content.subtitle && b.content.subtitle.length > 80) { b.content.subtitle = b.content.subtitle.split(/[.—,]/)[0] + "."; n++; }
    });
    changes.push(`Shortened ${n} text ${n === 1 ? "section" : "sections"}`);
    return done(n ? "Trimmed the copy down to the essentials." : "The copy is already nice and short.");
  }
  if (/\b(rename|call it|title)\b/.test(s) && /\bcampaign\b/.test(s)) {
    const t = quoted(raw) ?? afterTo(raw);
    if (t) { c.title = t; changes.push(`Campaign renamed → "${t}"`); return done(`Renamed the campaign to "${t}".`); }
  }

  return {
    campaign: null,
    changes: [],
    reply:
      "I couldn't map that to a change yet. Try things like \"make the headline bigger\", \"change background to navy\", \"add a registration form\", \"replace the hero image\" or \"make it look more premium\". You can also click any block and edit it directly.",
  };
}

/**
 * Requests scoped to one selected element (headline, button, photo…): formatting, colour and new wording.
 * Returns null when the request isn't about that element's look or text, so the caller falls back to `interpret`.
 */
export function interpretElement(input: string, current: Campaign, blockId: string, key: ElementKey): AssistantResult | null {
  const raw = input.trim();
  const s = raw.toLowerCase();
  const c: Campaign = JSON.parse(JSON.stringify(current));
  const i = c.blocks.findIndex((b) => b.id === blockId);
  const meta = i >= 0 ? elementMeta(c.blocks[i].type, key) : null;
  if (!raw || !meta) return null;
  let b = c.blocks[i];
  const name = meta.label.toLowerCase();
  const changes: string[] = [];
  const said: string[] = [];
  const fmt = (patch: Partial<ElementStyle>, change: string, phrase: string) => { b = setElementStyle(b, key, patch); changes.push(`${meta.label} ${change}`); said.push(phrase); };
  const neg = (w: string) => new RegExp(`\\b(no|not|remove|without|un|stop)[- ]?(the )?${w}`).test(s);

  if (meta.kind === "image") {
    if (/\b(replace|change|swap|new|different|another)\b/.test(s)) { b = { ...b, content: { ...b.content, image: nextImage(b.content.image) } }; changes.push(`${meta.label} replaced`); said.push("swapped to a new photo"); }
    if (/\b(darker|darken|moodier)\b/.test(s)) { b = { ...b, content: { ...b.content, overlay: clamp((b.content.overlay ?? 0.35) + 0.15, 0, 0.9) } }; changes.push("Photo darkened"); said.push("darkened"); }
    if (/\b(lighter|brighter|brighten)\b/.test(s)) { b = { ...b, content: { ...b.content, overlay: clamp((b.content.overlay ?? 0.35) - 0.15, 0, 0.9) } }; changes.push("Photo brightened"); said.push("brightened"); }
    if (/\b(taller|bigger|larger)\b/.test(s)) { b = { ...b, content: { ...b.content, imageHeight: clamp((b.content.imageHeight ?? 320) + 60, 180, 600) } }; changes.push("Photo taller"); said.push("made taller"); }
    if (/\b(shorter|smaller)\b/.test(s)) { b = { ...b, content: { ...b.content, imageHeight: clamp((b.content.imageHeight ?? 320) - 60, 180, 600) } }; changes.push("Photo shorter"); said.push("made shorter"); }
  } else {
    if (/\bitalic/.test(s)) { if (neg("italic")) fmt({ italic: undefined }, "not italic", "upright"); else fmt({ italic: true }, "italic", "italic"); }
    if (/\bunderline/.test(s)) { if (neg("underline")) fmt({ underline: undefined }, "not underlined", "without underline"); else fmt({ underline: true }, "underlined", "underlined"); }
    if (/\b(bold|bolder|heavier|thicker|stronger)\b/.test(s)) { if (neg("bold")) fmt({ bold: false }, "regular weight", "regular weight"); else fmt({ bold: true }, "bold", "bold"); }
    else if (/\b(lighter|thinner|regular weight|not bold)\b/.test(s)) fmt({ bold: false }, "regular weight", "regular weight");
    if (/\b(serif|editorial)\b/.test(s) && !/\bsans\b/.test(s)) fmt({ font: "fraunces" }, "font → Editorial serif", "in an editorial serif");
    else if (/\b(sans|modern font|clean font)\b/.test(s)) fmt({ font: "jakarta" }, "font → Modern sans", "in a modern sans");
    else if (/\b(grotesque|chunky|display font)\b/.test(s)) fmt({ font: "bricolage" }, "font → Bold grotesque", "in a bold grotesque");
    const color = parseColor(s);
    if (color && !/\bbackground\b/.test(s)) fmt({ color: color.hex }, `colour → ${color.name}`, color.name);
    if (meta.heading && /\b(big|bigger|larger|huge)\b/.test(s)) { b = { ...b, style: { ...b.style, headingScale: clamp(+(b.style.headingScale + 0.2).toFixed(2), 0.7, 1.8) } }; changes.push(`${meta.label} bigger`); said.push("bigger"); }
    if (meta.heading && /\b(small|smaller)\b/.test(s)) { b = { ...b, style: { ...b.style, headingScale: clamp(+(b.style.headingScale - 0.15).toFixed(2), 0.7, 1.8) } }; changes.push(`${meta.label} smaller`); said.push("smaller"); }
    if (!said.length) {
      const text = quoted(raw) ?? (/\b(change|set|make|rename|say|says|read|reads)\b/.test(s) ? afterTo(raw) : null);
      if (text) { b = { ...b, content: { ...b.content, [key]: text } }; c.blocks[i] = b; return { campaign: c, reply: `Changed the ${name} to "${text}".`, changes: [`${meta.label} → "${text}"`], selectId: blockId }; }
    }
  }
  if (!said.length) return null;
  c.blocks[i] = b;
  return { campaign: c, reply: `The ${name} is now ${said.join(", ")}.`, changes, selectId: blockId };
}
