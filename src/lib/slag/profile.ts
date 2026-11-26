import { z } from "zod";

/** Lesotho numbers: +266 followed by 8 digits. Mobile starts with 5 or 6, landline with 2. */
export const LESOTHO_CODE = "+266";
const VALID_FIRST_DIGITS = ["2", "5", "6"];

export const USAGES = [
  "Promote my business",
  "Events",
  "Freelance & services",
  "Community & causes",
  "Personal projects",
  "Something else",
] as const;
export type Usage = (typeof USAGES)[number];

export interface Profile {
  name: string;
  phone: string; // E.164, e.g. +26658001234
  usage: Usage[];
  completedAt: string;
}

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: string };

/** Accepts "5800 1234", "+266 5800 1234", "00266-5800-1234", "26658001234". */
export function parseLesothoPhone(input: string): PhoneResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Enter your phone number." };
  if (/[^\d\s()+.-]/.test(raw)) return { ok: false, error: "Use digits only, e.g. 5800 1234." };
  let digits = raw.replace(/\D/g, "");
  const international = raw.startsWith("+") || raw.startsWith("00");
  if (raw.startsWith("00")) digits = digits.slice(2);
  if (international || digits.length > 8) {
    if (!digits.startsWith("266")) return { ok: false, error: "Only Lesotho (+266) numbers are supported." };
    digits = digits.slice(3);
  }
  if (digits.length !== 8) return { ok: false, error: "Lesotho numbers have 8 digits, e.g. 5800 1234." };
  if (!VALID_FIRST_DIGITS.includes(digits[0])) return { ok: false, error: "Lesotho numbers start with 2, 5 or 6." };
  return { ok: true, e164: `${LESOTHO_CODE}${digits}` };
}

/** "+26658001234" -> "+266 5800 1234" */
export function formatLesothoPhone(e164: string): string {
  const d = e164.replace(/^\+266/, "");
  return `${LESOTHO_CODE} ${d.slice(0, 4)} ${d.slice(4)}`.trim();
}

/** Local part only, for the input next to the fixed +266 prefix: "+26658001234" -> "5800 1234" */
export function localLesothoPhone(e164: string): string {
  const d = e164.replace(/^\+266/, "");
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Enter your name (at least 2 letters)." })
    .max(60, { message: "Keep your name under 60 characters." }),
  phone: z.string().transform((v, ctx) => {
    const r = parseLesothoPhone(v);
    if (!r.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.error });
      return z.NEVER;
    }
    return r.e164;
  }),
  usage: z.array(z.enum(USAGES)).max(USAGES.length).default([]),
});

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
