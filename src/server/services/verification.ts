import type { VerificationCategory, VerificationSubject } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { assertPermission, type Actor } from "@/server/authz/policies";
import { notFound } from "@/server/errors";

/**
 * Public copy for each badge. Deliberately precise about what was and was NOT checked — no badge
 * ever implies title, legal or ownership verification.
 */
export const BADGE_COPY: Record<VerificationCategory, { label: string; meaning: string }> = {
  PARTNER_VERIFIED: {
    label: "Verified Partner",
    meaning:
      "YAKI'S LUXE HOMES has reviewed this partner's business identity and registration details on the date shown. This is not a guarantee of any transaction or of title to any property.",
  },
  LISTING_VERIFIED: {
    label: "Listing Verified",
    meaning:
      "YAKI'S LUXE HOMES confirmed with the partner that this listing is authorised and currently marketed by them on the date shown. It is not a legal or title verification.",
  },
  INSPECTION_COMPLETED: {
    label: "Inspection Completed",
    meaning:
      "A YAKI'S LUXE HOMES representative visited the property on the date shown. This is a visual inspection, not a structural survey or legal check.",
  },
  DOCUMENTATION_REVIEWED: {
    label: "Documentation Reviewed",
    meaning:
      "YAKI'S LUXE HOMES sighted documents supplied by the partner on the date shown. This is not legal advice or a title search — always engage your own lawyer and conduct independent searches.",
  },
  FEATURED_PARTNER: {
    label: "Featured Partner",
    meaning: "A partner selected by YAKI'S LUXE HOMES for featured placement. Featuring is editorial, not a verification.",
  },
};

export type PublicBadge = {
  category: VerificationCategory;
  label: string;
  meaning: string;
  verifiedAt: Date | null;
  publicNote: string | null;
};

/** The only way badges reach the UI: ACTIVE records whose review date hasn't passed. */
export function activeBadgeWhere(now = new Date()) {
  return { status: "ACTIVE" as const, OR: [{ reviewDueAt: null }, { reviewDueAt: { gt: now } }] };
}

export function toPublicBadges(records: Array<{ category: VerificationCategory; verifiedAt: Date | null; publicNote: string | null }>): PublicBadge[] {
  const seen = new Set<VerificationCategory>();
  return records
    .filter((r) => (seen.has(r.category) ? false : (seen.add(r.category), true)))
    .map((r) => ({ category: r.category, ...BADGE_COPY[r.category], verifiedAt: r.verifiedAt, publicNote: r.publicNote }));
}

const PROPERTY_CATEGORIES: VerificationCategory[] = ["LISTING_VERIFIED", "INSPECTION_COMPLETED", "DOCUMENTATION_REVIEWED"];
const PARTNER_CATEGORIES: VerificationCategory[] = ["PARTNER_VERIFIED", "FEATURED_PARTNER"];

export const createVerificationSchema = z.object({
  subjectType: z.enum(["PARTNER", "PROPERTY"]),
  subjectId: z.string().min(1),
  category: z.enum(["PARTNER_VERIFIED", "LISTING_VERIFIED", "INSPECTION_COMPLETED", "DOCUMENTATION_REVIEWED", "FEATURED_PARTNER"]),
  status: z.enum(["PENDING", "ACTIVE"]),
  reviewDueAt: z.coerce.date().optional(),
  publicNote: z.string().trim().max(300).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
  documentIds: z.array(z.string()).max(20).optional(),
});

export async function createVerification(actor: Actor, input: z.input<typeof createVerificationSchema>) {
  assertPermission(actor, "verification:manage");
  const data = createVerificationSchema.parse(input);
  const subject: VerificationSubject = data.subjectType;
  const allowed = subject === "PROPERTY" ? PROPERTY_CATEGORIES : PARTNER_CATEGORIES;
  if (!allowed.includes(data.category)) throw new Error("Category does not apply to this subject");
  if (subject === "PROPERTY") {
    if (!(await db.property.findUnique({ where: { id: data.subjectId }, select: { id: true } }))) throw notFound();
  } else if (!(await db.partner.findUnique({ where: { id: data.subjectId }, select: { id: true } }))) throw notFound();

  const record = await db.verificationRecord.create({
    data: {
      subjectType: subject,
      propertyId: subject === "PROPERTY" ? data.subjectId : null,
      partnerId: subject === "PARTNER" ? data.subjectId : null,
      category: data.category,
      status: data.status,
      verifiedById: data.status === "ACTIVE" ? actor.id : null,
      verifiedAt: data.status === "ACTIVE" ? new Date() : null,
      reviewDueAt: data.reviewDueAt,
      publicNote: data.publicNote,
      internalNotes: data.internalNotes,
      documents: data.documentIds?.length ? { connect: data.documentIds.map((id) => ({ id })) } : undefined,
    },
  });
  await audit({ actorId: actor.id, action: "verification.created", entityType: "VerificationRecord", entityId: record.id, after: record });
  return record;
}

export async function setVerificationStatus(actor: Actor, id: string, status: "ACTIVE" | "REVOKED", note?: string) {
  assertPermission(actor, "verification:manage");
  const before = await db.verificationRecord.findUnique({ where: { id } });
  if (!before) throw notFound();
  const after = await db.verificationRecord.update({
    where: { id },
    data: {
      status,
      ...(status === "ACTIVE" ? { verifiedById: actor.id, verifiedAt: new Date() } : {}),
      internalNotes: note ? `${before.internalNotes ?? ""}\n[${new Date().toISOString()}] ${note}`.trim() : before.internalNotes,
    },
  });
  await audit({ actorId: actor.id, action: `verification.${status.toLowerCase()}`, entityType: "VerificationRecord", entityId: id, before, after });
  return after;
}

/** Job: records past their review date stop showing publicly and are marked EXPIRED. */
export async function expireVerifications(now = new Date()): Promise<number> {
  const res = await db.verificationRecord.updateMany({ where: { status: "ACTIVE", reviewDueAt: { lte: now } }, data: { status: "EXPIRED" } });
  return res.count;
}
