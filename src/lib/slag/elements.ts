import type { CSSProperties } from "react";
import { POSTER_FONTS } from "./themes";
import type { Block, BlockType, ElementKey, ElementStyle } from "./types";

export type ElementKind = "text" | "image" | "button";

export interface ElementMeta {
  key: ElementKey;
  label: string;
  kind: ElementKind;
  /** Uses the block's heading size and weight. */
  heading?: boolean;
  /** Renders bold when the user hasn't chosen otherwise. */
  bold?: boolean;
  multiline?: boolean;
}

/** The pieces a user can click and edit inside each block, in poster order. */
export const BLOCK_ELEMENTS: Record<BlockType, ElementMeta[]> = {
  hero: [
    { key: "image", label: "Photo", kind: "image" },
    { key: "eyebrow", label: "Tag", kind: "text", bold: true },
    { key: "headline", label: "Headline", kind: "text", heading: true },
    { key: "subtitle", label: "Subtitle", kind: "text", multiline: true },
  ],
  text: [
    { key: "heading", label: "Heading", kind: "text", heading: true },
    { key: "body", label: "Body text", kind: "text", multiline: true },
  ],
  image: [
    { key: "image", label: "Image", kind: "image" },
    { key: "caption", label: "Caption", kind: "text" },
  ],
  offer: [
    { key: "heading", label: "Offer label", kind: "text", bold: true },
    { key: "price", label: "Price", kind: "text", heading: true },
    { key: "originalPrice", label: "Old price", kind: "text" },
    { key: "note", label: "Note", kind: "text" },
  ],
  details: [{ key: "heading", label: "Heading", kind: "text", heading: true }],
  cta: [{ key: "label", label: "Button", kind: "button", bold: true }],
  form: [
    { key: "heading", label: "Heading", kind: "text", heading: true },
    { key: "body", label: "Description", kind: "text" },
    { key: "submitLabel", label: "Open form button", kind: "text", bold: true },
  ],
  social: [{ key: "heading", label: "Heading", kind: "text", bold: true }],
  footer: [
    { key: "text", label: "Footer text", kind: "text", bold: true },
    { key: "small", label: "Small print", kind: "text" },
  ],
};

export function elementMeta(type: BlockType, key: ElementKey | null | undefined): ElementMeta | null {
  if (!key) return null;
  return BLOCK_ELEMENTS[type].find((e) => e.key === key) ?? null;
}

export function getElementStyle(b: Block, key: ElementKey): ElementStyle {
  return b.style.elements?.[key] ?? {};
}

/** Whether the element currently renders bold (the user's choice, else its default). */
export function isBold(b: Block, key: ElementKey): boolean {
  const own = getElementStyle(b, key).bold;
  if (own !== undefined) return own;
  const meta = elementMeta(b.type, key);
  if (meta?.heading) return b.style.headingWeight >= 600;
  return !!meta?.bold;
}

/** Inline styles for an element's formatting; empty when the user changed nothing. */
export function elementCss(b: Block, key: ElementKey): CSSProperties {
  const el = getElementStyle(b, key);
  const css: CSSProperties = {};
  if (el.font && POSTER_FONTS[el.font]) css.fontFamily = POSTER_FONTS[el.font].family;
  if (el.bold === true) css.fontWeight = elementMeta(b.type, key)?.heading ? Math.max(b.style.headingWeight, 700) : 700;
  if (el.bold === false) css.fontWeight = 400;
  if (el.italic) css.fontStyle = "italic";
  if (el.underline) {
    css.textDecorationLine = key === "originalPrice" ? "underline line-through" : "underline";
    css.textUnderlineOffset = "0.14em";
  }
  if (el.color) css.color = el.color;
  return css;
}

/** Returns a copy of the block with the element's formatting patched; `undefined` values clear a setting. */
export function setElementStyle(b: Block, key: ElementKey, patch: Partial<ElementStyle>): Block {
  const next: ElementStyle = { ...getElementStyle(b, key), ...patch };
  for (const k of Object.keys(next) as (keyof ElementStyle)[]) if (next[k] === undefined) delete next[k];
  const elements = { ...(b.style.elements ?? {}) };
  if (Object.keys(next).length) elements[key] = next;
  else delete elements[key];
  return { ...b, style: { ...b.style, elements } };
}

/** Short preview of an element's content for pickers. */
export function elementPreview(b: Block, key: ElementKey): string {
  if (key === "image") return b.content.image ? "Photo" : "No photo yet";
  const v = (b.content[key] ?? "").trim();
  return v || "Empty";
}
