import { z } from "zod";
import { normalizeNigerianPhone } from "@/lib/phone";
import { nairaToKobo } from "@/lib/money";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizeNigerianPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid Nigerian phone number, e.g. 0803 123 4567" });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const nameSchema = z.string().trim().min(2, "Enter your full name").max(120);

/** Accepts "150000000", "150,000,000" or numbers; outputs kobo bigint. */
export const nairaSchema = z.union([z.string(), z.number()]).transform((v, ctx) => {
  try {
    const kobo = nairaToKobo(typeof v === "number" ? v : v.trim());
    if (kobo < 0n) throw new RangeError();
    return kobo;
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid amount in naira" });
    return z.NEVER;
  }
});

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^https:\/\//.test(v), "Use a secure https:// link");

/** Converts FormData into a plain object, collecting repeated keys into arrays. */
export function formToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string") continue;
    if (key.endsWith("[]")) {
      const k = key.slice(0, -2);
      const existing = out[k];
      if (Array.isArray(existing)) existing.push(value);
      else out[k] = [value];
    } else {
      out[key] = value;
    }
  }
  return out;
}
