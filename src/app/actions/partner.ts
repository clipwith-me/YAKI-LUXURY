"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authed } from "@/server/action";
import { DomainError, type ActionResult } from "@/server/errors";
import { formToObject } from "@/server/validation/common";
import { createProperty, updateProperty, archiveProperty } from "@/server/services/properties";
import { updatePartnerProfile } from "@/server/services/partners";
import { uploadPartnerDocument } from "@/server/services/documents";
import { addLeadNote } from "@/server/services/leads";
import { scheduleViewing, recordViewingOutcome } from "@/server/services/viewings";
import { recordOffer, updateOfferStatus } from "@/server/services/offers";
import { openDeal, markContractSigned, closeDeal } from "@/server/services/deals";
import { IMAGE_TYPES, storeUpload } from "@/server/storage";
import { rateLimit } from "@/server/rate-limit";
import type { OfferStatus } from "@prisma/client";

/** Builds the property payload from the form: checkbox arrays, URL list and uploaded photos. */
async function propertyPayload(form: FormData, actorId: string) {
  const raw = formToObject(form);
  const urls = String(raw.imageUrls ?? "").split(/\s+/).map((s) => s.trim()).filter(Boolean);
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 20) throw new DomainError("VALIDATION", "Upload up to 20 photos at a time.");
  if (files.length) await rateLimit(`upload:${actorId}`, 100, 3600);
  for (const f of files) {
    const stored = await storeUpload(f, { prefix: "public", allowed: IMAGE_TYPES, maxBytes: 8 * 1024 * 1024 });
    urls.push(`/media/${stored.key}`);
  }
  const list = (k: string) => (Array.isArray(raw[k]) ? (raw[k] as string[]) : []);
  return {
    ...(raw as Record<string, string>),
    features: String(raw.features ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
    amenities: list("amenities"),
    imageUrls: urls,
  } as never;
}

export async function savePropertyAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  let target = "";
  const res = await authed(async (actor) => {
    const submit = form.get("intent") === "submit";
    const id = String(form.get("id") ?? "");
    const payload = await propertyPayload(form, actor.id);
    if (id) {
      await updateProperty(actor, id, payload, { submit });
      target = actor.role === "PARTNER" ? `/partner/properties/${id}?saved=1` : `/admin/properties/${id}?saved=1`;
    } else {
      const partnerId = actor.role === "PARTNER" ? actor.partnerIds[0] : String(form.get("partnerId") ?? "");
      if (!partnerId) throw new DomainError("VALIDATION", "Choose a partner.");
      const p = await createProperty(actor, partnerId, payload, { submit });
      target = actor.role === "PARTNER" ? `/partner/properties/${p.id}?saved=1` : `/admin/properties/${p.id}?saved=1`;
    }
  });
  if (!res.ok) return res;
  redirect(target);
}

export async function archivePropertyAction(form: FormData): Promise<void> {
  await authed((actor) => archiveProperty(actor, String(form.get("id"))));
  revalidatePath("/partner/properties");
}

export async function updateCompanyProfileAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    const raw = formToObject(form) as Record<string, string>;
    await updatePartnerProfile(actor, actor.partnerIds[0] ?? "", { ...raw, areasServed: String(raw.areasServed ?? "").split(",").map((s) => s.trim()).filter(Boolean) } as never);
    revalidatePath("/partner/profile");
  }, "Company profile updated.");
}

export async function uploadDocumentAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("VALIDATION", "Choose a file to upload.", { file: ["Required"] });
    await rateLimit(`doc-upload:${actor.id}`, 30, 3600);
    await uploadPartnerDocument(actor, actor.partnerIds[0] ?? "", file, { type: String(form.get("type")) as never, title: String(form.get("title") ?? ""), propertyId: String(form.get("propertyId") ?? "") || undefined, expiresAt: String(form.get("expiresAt") ?? "") as never });
    revalidatePath("/partner/documents");
  }, "Document uploaded for review.");
}

// ───── Lead workflow actions (shared by partner and staff; services enforce who may do what) ─────

function leadPath(form: FormData): string {
  return String(form.get("returnTo") ?? "/");
}

export async function leadNoteAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    await addLeadNote(actor, String(form.get("leadId")), { body: String(form.get("body") ?? ""), kind: form.get("kind") === "CONTACT_LOGGED" ? "CONTACT_LOGGED" : "NOTE", channel: (String(form.get("channel") ?? "") || undefined) as never, partnerVisible: form.get("partnerVisible") === "on", nextFollowUpAt: (String(form.get("nextFollowUpAt") ?? "") || undefined) as never });
    revalidatePath(leadPath(form));
  }, "Saved.");
}

export async function scheduleViewingAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    await scheduleViewing(actor, String(form.get("leadId")), { scheduledAt: String(form.get("scheduledAt")) as never, mode: String(form.get("mode") ?? "IN_PERSON") as never, notes: String(form.get("notes") ?? "") || undefined });
    revalidatePath(leadPath(form));
  }, "Viewing scheduled.");
}

export async function viewingOutcomeAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    await recordViewingOutcome(actor, String(form.get("viewingId")), { outcome: String(form.get("outcome")) as never, notes: String(form.get("notes") ?? "") || undefined });
    revalidatePath(leadPath(form));
  }, "Viewing updated.");
}

export async function recordOfferAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    await recordOffer(actor, String(form.get("leadId")), { amount: String(form.get("amount") ?? ""), notes: String(form.get("notes") ?? "") || undefined });
    revalidatePath(leadPath(form));
  }, "Offer recorded.");
}

export async function offerStatusAction(form: FormData): Promise<void> {
  await authed((actor) => updateOfferStatus(actor, String(form.get("offerId")), String(form.get("status")) as OfferStatus));
  revalidatePath(leadPath(form));
}

export async function openDealAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    await openDeal(actor, String(form.get("leadId")), { agreedPrice: String(form.get("agreedPrice") ?? ""), notes: String(form.get("notes") ?? "") || undefined });
    revalidatePath(leadPath(form));
  }, "Deal opened.");
}

export async function dealStageAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    const dealId = String(form.get("dealId"));
    if (form.get("stage") === "SIGNED") await markContractSigned(actor, dealId);
    else await closeDeal(actor, dealId, { finalPrice: (String(form.get("finalPrice") ?? "") || undefined) as never, closedAt: (String(form.get("closedAt") ?? "") || undefined) as never });
    revalidatePath(leadPath(form));
  }, "Deal updated.");
}
