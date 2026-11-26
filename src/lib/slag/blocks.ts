import type { Block, BlockStyle, BlockType, FormField } from "./types";

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const BLOCK_META: Record<BlockType, { label: string; description: string }> = {
  hero: { label: "Hero", description: "Main visual, title and headline" },
  text: { label: "Text", description: "Supporting information" },
  image: { label: "Image", description: "Photo or graphic" },
  offer: { label: "Offer", description: "Price, discount or deal" },
  details: { label: "Details", description: "Dates, venue, contact" },
  cta: { label: "Button", description: "Call to action" },
  form: { label: "Form", description: "Registration or enquiry" },
  social: { label: "Social", description: "Social and contact links" },
  footer: { label: "Footer", description: "Branding and terms" },
};

export const ADDABLE_BLOCKS: BlockType[] = ["text", "image", "offer", "details", "cta", "form", "social", "footer", "hero"];

export function baseStyle(partial: Partial<BlockStyle> = {}): BlockStyle {
  return { align: "center", padding: 40, headingScale: 1, headingWeight: 700, ...partial };
}

export function registrationFields(): FormField[] {
  return [
    { id: uid("f"), label: "Full name", type: "text", required: true },
    { id: uid("f"), label: "Phone number", type: "tel", required: true },
    { id: uid("f"), label: "Email", type: "email", required: false },
  ];
}

export function enquiryFields(): FormField[] {
  return [
    { id: uid("f"), label: "Your name", type: "text", required: true },
    { id: uid("f"), label: "Phone or email", type: "text", required: true },
    { id: uid("f"), label: "Message", type: "textarea", required: false },
  ];
}

export function createBlock(type: BlockType, overrides: Partial<Block["content"]> = {}): Block {
  const id = uid(type);
  switch (type) {
    case "hero":
      return {
        id, type,
        content: { eyebrow: "New campaign", headline: "Your headline here", subtitle: "A short line that tells people why they should care.", image: "lib:community", imageHeight: 360, overlay: 0.35, ...overrides },
        style: baseStyle({ padding: 56, headingScale: 1.2, headingWeight: 800 }),
      };
    case "text":
      return { id, type, content: { heading: "About", body: "Tell visitors what this is about in two or three friendly sentences.", ...overrides }, style: baseStyle({ align: "left", padding: 36, headingScale: 0.9 }) };
    case "image":
      return { id, type, content: { image: "lib:community", caption: "", imageHeight: 280, rounded: true, ...overrides }, style: baseStyle({ padding: 20 }) };
    case "offer":
      return { id, type, content: { heading: "Special offer", price: "M99", originalPrice: "M149", note: "Limited time only", ...overrides }, style: baseStyle({ padding: 44, headingScale: 1 }) };
    case "details":
      return {
        id, type,
        content: {
          heading: "Details",
          items: [
            { id: uid("d"), icon: "date", label: "Date", value: "Saturday, 12 December" },
            { id: uid("d"), icon: "location", label: "Venue", value: "Maseru, Lesotho" },
          ],
          ...overrides,
        },
        style: baseStyle({ align: "left", padding: 36, headingScale: 0.85 }),
      };
    case "cta":
      return { id, type, content: { label: "Contact us on WhatsApp", action: "whatsapp", target: "", message: "Hi! I saw your campaign and would like to know more.", note: "", ...overrides }, style: baseStyle({ padding: 32 }) };
    case "form":
      return { id, type, content: { heading: "Register your interest", body: "Leave your details and we'll be in touch.", fields: registrationFields(), submitLabel: "Submit", successMessage: "Thank you! We've received your details.", ...overrides }, style: baseStyle({ align: "left", padding: 40, headingScale: 0.9 }) };
    case "social":
      return { id, type, content: { heading: "Follow along", links: [ { id: uid("s"), platform: "instagram", url: "" }, { id: uid("s"), platform: "facebook", url: "" } ], ...overrides }, style: baseStyle({ padding: 32, headingScale: 0.75 }) };
    case "footer":
      return { id, type, content: { text: "Thank you for your support", small: "Terms and conditions apply.", ...overrides }, style: baseStyle({ padding: 28, headingScale: 0.8 }) };
  }
}

export function cloneBlock(b: Block): Block {
  const copy: Block = JSON.parse(JSON.stringify(b));
  copy.id = uid(b.type);
  return copy;
}

/** Where a new block should go: forms/CTAs before footer, otherwise after selection or before footer. */
export function insertIndex(blocks: Block[], afterId?: string | null): number {
  if (afterId) {
    const i = blocks.findIndex((b) => b.id === afterId);
    if (i >= 0) return i + 1;
  }
  const footer = blocks.findIndex((b) => b.type === "footer");
  return footer >= 0 ? footer : blocks.length;
}

export function whatsappLink(number?: string, message?: string): string {
  const digits = (number ?? "").replace(/[^\d]/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function safeUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
