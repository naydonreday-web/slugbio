import neon from "@/assets/poster-neon-fest.jpg";
import coffee from "@/assets/poster-coffee.jpg";
import market from "@/assets/poster-market.jpg";
import designer from "@/assets/poster-designer.jpg";
import product from "@/assets/poster-product.jpg";
import community from "@/assets/poster-community.jpg";

export const IMAGE_LIBRARY: { key: string; label: string; src: string; tags: string[] }[] = [
  { key: "neon", label: "Festival crowd", src: neon, tags: ["event", "music", "party", "festival", "concert", "night"] },
  { key: "coffee", label: "Coffee bar", src: coffee, tags: ["food", "coffee", "cafe", "pop-up", "drink"] },
  { key: "market", label: "Fresh market", src: market, tags: ["food", "market", "farm", "fresh", "community"] },
  { key: "designer", label: "Design desk", src: designer, tags: ["service", "portfolio", "design", "freelance", "work"] },
  { key: "product", label: "Product studio", src: product, tags: ["product", "beauty", "launch", "shop", "offer"] },
  { key: "community", label: "Community table", src: community, tags: ["community", "announcement", "gathering", "event", "other"] },
];

export function resolveImage(ref?: string): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith("lib:")) {
    return IMAGE_LIBRARY.find((i) => i.key === ref.slice(4))?.src;
  }
  return ref;
}

export function pickImageFor(words: string): string {
  const w = words.toLowerCase();
  let best = IMAGE_LIBRARY[5];
  let score = 0;
  for (const img of IMAGE_LIBRARY) {
    const s = img.tags.reduce((n, t) => (w.includes(t) ? n + 1 : n), 0);
    if (s > score) {
      score = s;
      best = img;
    }
  }
  return `lib:${best.key}`;
}

export function nextImage(ref?: string): string {
  const idx = IMAGE_LIBRARY.findIndex((i) => `lib:${i.key}` === ref);
  return `lib:${IMAGE_LIBRARY[(idx + 1) % IMAGE_LIBRARY.length].key}`;
}
