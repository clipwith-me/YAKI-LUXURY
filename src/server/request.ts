import { cookies, headers } from "next/headers";
import { keyedHash } from "@/server/auth/tokens";

export const VISITOR_COOKIE = "ylh_vid";
export const ATTRIBUTION_COOKIE = "ylh_attr";

/** Rate-limit key derived from the client IP. The raw IP is hashed, never stored or logged. */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return keyedHash(`ip:${ip}`);
}

export async function visitorHash(): Promise<string | null> {
  const jar = await cookies();
  const vid = jar.get(VISITOR_COOKIE)?.value;
  return vid ? keyedHash(`vid:${vid}`) : null;
}

export type FirstTouch = {
  at?: string;
  landing?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

/** First-touch marketing context captured by middleware on the visitor's first page view. */
export async function readFirstTouch(): Promise<FirstTouch> {
  const jar = await cookies();
  const raw = jar.get(ATTRIBUTION_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: FirstTouch = {};
    for (const k of ["at", "landing", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
      const v = parsed[k];
      if (typeof v === "string") out[k] = v.slice(0, 500);
    }
    return out;
  } catch {
    return {};
  }
}
