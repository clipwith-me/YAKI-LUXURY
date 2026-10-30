"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { authed, publicAction } from "@/server/action";
import { getSessionUser, createSession, destroySession } from "@/server/auth/session";
import { DomainError, toActionError, type ActionResult } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { clientFingerprint, readFirstTouch, visitorHash } from "@/server/request";
import { createInquiry } from "@/server/services/leads";
import { toggleFavorite, createAlert } from "@/server/services/customers";
import { applyAsPartner } from "@/server/services/partners";
import { authenticate, registerCustomer } from "@/server/services/auth";
import { track } from "@/server/services/analytics";
import { emailSchema, formToObject } from "@/server/validation/common";
import { isStaff } from "@/server/authz/permissions";
import { parseSearchParams } from "@/server/search/filters";

export async function subscribeNewsletter(_prev: unknown, form: FormData): Promise<ActionResult> {
  return publicAction(async () => {
    await rateLimit(`newsletter:${await clientFingerprint()}`, 5, 3600);
    const email = emailSchema.parse(form.get("email"));
    await db.newsletterSubscriber.upsert({ where: { email }, create: { email, source: String(form.get("source") ?? "site").slice(0, 40) }, update: {} });
  }, "Thank you — you're on the list.");
}

/**
 * Public enquiry → Lead. Honeypot + rate limit for spam; the lead service handles dedupe,
 * attribution, notifications and risk signals.
 */
export async function submitInquiry(_prev: unknown, form: FormData): Promise<ActionResult<{ leadCode: string }>> {
  try {
    if (form.get("company_website")) return { ok: true, data: { leadCode: "" }, message: "Thank you." }; // honeypot: bots fill hidden fields
    await rateLimit(`inquiry:${await clientFingerprint()}`, 8, 3600);
    const raw = formToObject(form);
    const user = await getSessionUser();
    const h = await headers();
    const referer = h.get("referer");
    const result = await createInquiry(
      { ...(raw as Record<string, string>), consent: raw.consent === "on" } as never,
      { userId: user?.role === "CUSTOMER" ? user.id : null, referralUrl: referer?.slice(0, 500) ?? null, firstTouch: await readFirstTouch(), visitorHash: await visitorHash() },
    );
    return {
      ok: true,
      data: { leadCode: result.leadCode },
      message: result.repeat
        ? `Thank you — we've added this to your existing enquiry ${result.leadCode}. An advisor will be in touch.`
        : `Thank you. Your reference is ${result.leadCode}. A YAKI advisor will contact you shortly.`,
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleFavoriteAction(propertyId: string): Promise<ActionResult<{ saved: boolean }>> {
  return authed(async (actor) => ({ saved: await toggleFavorite(actor, z.string().min(1).parse(propertyId)) }));
}

export async function createAlertAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    const query = String(form.get("query") ?? "");
    const criteria = parseSearchParams(Object.fromEntries(new URLSearchParams(query)));
    delete criteria.page;
    delete criteria.sort;
    await createAlert(actor, { name: String(form.get("name") ?? ""), frequency: String(form.get("frequency") ?? "DAILY") as "DAILY", criteria });
  }, "Alert created. We'll let you know when new homes match.");
}

export async function trackShareAction(propertyId: string, channel: string): Promise<void> {
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { partnerId: true } });
  if (!property) return;
  const user = await getSessionUser();
  await track({ type: channel === "whatsapp" ? "WHATSAPP_CLICK" : "SHARE", propertyId, partnerId: property.partnerId, userId: user?.id, visitorHash: await visitorHash(), metadata: { channel: channel.slice(0, 20) } });
}

function safeNext(next: FormDataEntryValue | null, fallback: string): string {
  const v = typeof next === "string" ? next : "";
  // Only same-site relative paths — prevents open redirects.
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

function homeFor(role: string): string {
  if (role === "PARTNER") return "/partner";
  if (role === "CUSTOMER") return "/account";
  return "/admin";
}

export async function loginAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  let destination = "/";
  try {
    const fp = await clientFingerprint();
    const email = String(form.get("email") ?? "").toLowerCase();
    await rateLimit(`login:ip:${fp}`, 20, 900);
    await rateLimit(`login:email:${email}`, 8, 900);
    const user = await authenticate({ email, password: String(form.get("password") ?? "") });
    await createSession(user.id);
    destination = safeNext(form.get("next"), homeFor(user.role));
    // Staff can't be bounced into the partner/customer areas and vice-versa by a crafted ?next.
    if (destination.startsWith("/admin") && !isStaff(user.role)) destination = homeFor(user.role);
    if (destination.startsWith("/partner") && user.role !== "PARTNER") destination = homeFor(user.role);
  } catch (err) {
    return toActionError(err);
  }
  redirect(destination);
}

export async function registerAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  let destination = "/account";
  try {
    await rateLimit(`register:${await clientFingerprint()}`, 5, 3600);
    const user = await registerCustomer({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      password: String(form.get("password") ?? ""),
      marketingOptIn: form.get("marketingOptIn") === "on",
    });
    await createSession(user.id);
    destination = safeNext(form.get("next"), "/account");
    if (destination.startsWith("/admin") || destination.startsWith("/partner")) destination = "/account";
  } catch (err) {
    return toActionError(err);
  }
  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function applyPartnerAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  try {
    if (form.get("company_website")) throw new DomainError("VALIDATION", "Please try again.");
    await rateLimit(`partner-apply:${await clientFingerprint()}`, 3, 3600);
    const raw = formToObject(form);
    const split = (v: unknown) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const { userId } = await applyAsPartner({
      ...(raw as Record<string, string>),
      areasServed: split(raw.areasServed),
      propertyCategories: Array.isArray(raw.propertyCategories) ? (raw.propertyCategories as string[]) : split(raw.propertyCategories),
      acceptTerms: raw.acceptTerms === "on",
    } as never);
    await createSession(userId);
  } catch (err) {
    return toActionError(err);
  }
  redirect("/partner?applied=1");
}
