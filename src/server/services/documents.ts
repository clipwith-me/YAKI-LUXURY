import { DocumentStatus, DocumentType } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { assertPartnerScope, assertPermission, isPartnerMember, type Actor } from "@/server/authz/policies";
import { hasPermission, isStaff } from "@/server/authz/permissions";
import { forbidden, notFound } from "@/server/errors";
import { notifyUsers, partnerUserIds } from "@/server/notifications/notify";
import { DOCUMENT_TYPES, storage, storeUpload } from "@/server/storage";

export const documentMetaSchema = z.object({
  type: z.nativeEnum(DocumentType),
  title: z.string().trim().min(2).max(160),
  propertyId: z.string().optional(),
  expiresAt: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
});

export async function uploadPartnerDocument(actor: Actor, partnerId: string, file: File, meta: z.input<typeof documentMetaSchema>) {
  assertPartnerScope(actor, partnerId, "document:review");
  const data = documentMetaSchema.parse(meta);
  if (data.propertyId) {
    const prop = await db.property.findFirst({ where: { id: data.propertyId, partnerId }, select: { id: true } });
    if (!prop) throw notFound();
  }
  const stored = await storeUpload(file, { prefix: "private", allowed: DOCUMENT_TYPES, maxBytes: 15 * 1024 * 1024 });
  const doc = await db.document.create({
    data: {
      type: data.type,
      title: data.title,
      fileName: file.name.slice(0, 200),
      storageKey: stored.key,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      partnerId,
      propertyId: data.propertyId,
      expiresAt: data.expiresAt,
      uploadedById: actor.id,
      visibility: "PRIVATE",
    },
  });
  await audit({ actorId: actor.id, action: "document.uploaded", entityType: "Document", entityId: doc.id, after: { type: doc.type, title: doc.title } });
  return doc;
}

export async function reviewDocument(actor: Actor, documentId: string, status: Exclude<DocumentStatus, "PENDING">, notes?: string) {
  assertPermission(actor, "document:review");
  const before = await db.document.findUnique({ where: { id: documentId } });
  if (!before) throw notFound();
  const after = await db.document.update({ where: { id: documentId }, data: { status, reviewNotes: notes, reviewedById: actor.id, reviewedAt: new Date() } });
  await audit({ actorId: actor.id, action: `document.${status.toLowerCase()}`, entityType: "Document", entityId: documentId, before: { status: before.status }, after: { status, notes } });
  return after;
}

/** Streams a private document only to its partner's members or staff with review permission. */
export async function readDocumentForActor(actor: Actor | null, documentId: string) {
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.deletedAt) throw notFound();
  if (doc.visibility !== "PUBLIC") {
    if (!actor) throw forbidden();
    const isOwner = doc.partnerId ? isPartnerMember(actor, doc.partnerId) : false;
    const isReviewer = isStaff(actor.role) && (hasPermission(actor.role, "document:review") || hasPermission(actor.role, "agreement:manage"));
    if (!isOwner && !isReviewer) throw notFound();
  }
  return { doc, data: await storage().get(doc.storageKey) };
}

/** Job: mark expired documents and warn partners 30 days ahead. */
export async function processDocumentExpiry(now = new Date()): Promise<{ expired: number; warned: number }> {
  const expired = await db.document.updateMany({ where: { expiresAt: { lte: now }, status: { notIn: ["EXPIRED", "REJECTED"] } }, data: { status: "EXPIRED" } });
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiring = await db.document.findMany({ where: { expiresAt: { gt: now, lte: soon }, status: "APPROVED", partnerId: { not: null } }, select: { id: true, title: true, partnerId: true, expiresAt: true } });
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let warned = 0;
  for (const d of expiring) {
    const link = `/partner/documents#${d.id}`;
    // Idempotent: at most one warning per document per 30 days, however often the job runs.
    if (await db.notification.findFirst({ where: { type: "document.expiring", link, createdAt: { gte: since } }, select: { id: true } })) continue;
    await notifyUsers(db, await partnerUserIds(db, d.partnerId!), { type: "document.expiring", title: "Document expiring soon", body: `${d.title} expires on ${d.expiresAt!.toISOString().slice(0, 10)}`, link });
    warned++;
  }
  return { expired: expired.count, warned };
}
