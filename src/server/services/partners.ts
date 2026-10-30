import { PartnerStatus, PartnerType, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { hashPassword } from "@/server/auth/password";
import { assertPermission, assertPartnerScope, type Actor } from "@/server/authz/policies";
import { DomainError, invalidState, notFound } from "@/server/errors";
import { notifyUsers, partnerUserIds, staffWithPermission } from "@/server/notifications/notify";
import { raiseFlag } from "@/server/services/risk";
import { emailSchema, nameSchema, optionalText, optionalUrl, passwordSchema, phoneSchema } from "@/server/validation/common";
import { slugify } from "@/lib/slug";
import { randomCode } from "@/lib/ids";

export const partnerApplicationSchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name").max(160),
  type: z.nativeEnum(PartnerType),
  contactName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  officeAddress: z.string().trim().min(5, "Enter your office address").max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  website: optionalUrl,
  registrationNumber: optionalText(60),
  licenseInfo: optionalText(500),
  description: optionalText(2000),
  areasServed: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  propertyCategories: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the partner terms to continue" }) }),
});
export type PartnerApplicationInput = z.input<typeof partnerApplicationSchema>;

/**
 * Public partner application. Creates the login, the partner organisation (PENDING) and the
 * ownership link atomically. Partners can sign in to track status but cannot list until APPROVED.
 */
export async function applyAsPartner(input: PartnerApplicationInput) {
  const data = partnerApplicationSchema.parse(input);
  const existingUser = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existingUser) {
    throw new DomainError("CONFLICT", "An account with this email already exists. Please sign in instead.", { email: ["Already registered"] });
  }
  const passwordHash = await hashPassword(data.password);
  const baseSlug = slugify(data.companyName) || "partner";

  const partner = await db.$transaction(async (tx) => {
    const slugTaken = await tx.partner.findUnique({ where: { slug: baseSlug }, select: { id: true } });
    const slug = slugTaken ? `${baseSlug}-${randomCode(4).toLowerCase()}` : baseSlug;
    const user = await tx.user.create({
      data: { email: data.email, passwordHash, name: data.contactName, phone: data.phone, role: "PARTNER" },
    });
    const created = await tx.partner.create({
      data: {
        slug,
        companyName: data.companyName,
        type: data.type,
        email: data.email,
        phone: data.phone,
        officeAddress: data.officeAddress,
        city: data.city,
        state: data.state,
        website: data.website,
        registrationNumber: data.registrationNumber,
        licenseInfo: data.licenseInfo,
        description: data.description,
        areasServed: data.areasServed,
        propertyCategories: data.propertyCategories,
        status: "PENDING",
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    // Risk: same registration number or contact email already on another partner.
    if (data.registrationNumber) {
      const dup = await tx.partner.findFirst({
        where: { id: { not: created.id }, registrationNumber: { equals: data.registrationNumber, mode: "insensitive" } },
        select: { id: true },
      });
      if (dup) await raiseFlag(tx, { subjectType: "PARTNER", subjectId: created.id, reason: "DUPLICATE_PARTNER", details: `Registration number matches partner ${dup.id}` });
    }

    await audit({ actorId: user.id, action: "partner.applied", entityType: "Partner", entityId: created.id, after: { companyName: created.companyName, type: created.type } }, tx);
    const reviewers = await staffWithPermission(tx, "partner:review");
    await notifyUsers(tx, reviewers, {
      type: "partner.applied",
      title: "New partner application",
      body: `${created.companyName} has applied to become a partner.`,
      link: `/admin/partners/${created.id}`,
    });
    return { partner: created, userId: user.id };
  });
  return partner;
}

const REVIEW_TRANSITIONS: Record<PartnerStatus, PartnerStatus[]> = {
  PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "PENDING"],
  APPROVED: ["SUSPENDED"],
  SUSPENDED: ["APPROVED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"],
};

export async function setPartnerStatus(actor: Actor, partnerId: string, status: PartnerStatus, reason?: string) {
  assertPermission(actor, "partner:review");
  const before = await db.partner.findUnique({ where: { id: partnerId } });
  if (!before) throw notFound();
  if (!REVIEW_TRANSITIONS[before.status].includes(status)) {
    throw invalidState(`A partner that is ${before.status.toLowerCase().replace("_", " ")} cannot be moved to ${status.toLowerCase().replace("_", " ")}.`);
  }
  if ((status === "REJECTED" || status === "SUSPENDED") && !reason?.trim()) {
    throw new DomainError("VALIDATION", "Please record a reason.", { reason: ["Required"] });
  }

  return db.$transaction(async (tx) => {
    const after = await tx.partner.update({
      where: { id: partnerId },
      data: {
        status,
        statusReason: reason?.trim() || null,
        ...(status === "APPROVED" ? { approvedAt: before.approvedAt ?? new Date(), approvedById: actor.id } : {}),
      },
    });
    // Suspending a partner hides their listings immediately (they stay intact for reinstatement).
    await audit({ actorId: actor.id, action: `partner.${status.toLowerCase()}`, entityType: "Partner", entityId: partnerId, before: { status: before.status }, after: { status, reason } }, tx);
    const members = await partnerUserIds(tx, partnerId);
    await notifyUsers(tx, members, {
      type: status === "APPROVED" ? "partner.approved" : "partner.status_changed",
      title: status === "APPROVED" ? "Your partner account is approved" : `Partner account ${status.toLowerCase().replace("_", " ")}`,
      body:
        status === "APPROVED"
          ? "Welcome to YAKI'S LUXE HOMES. You can now submit properties for review."
          : reason
            ? `Status updated: ${reason}`
            : "Your partner account status has been updated.",
      link: "/partner",
    });
    return after;
  });
}

export const partnerProfileSchema = z.object({
  description: optionalText(2000),
  website: optionalUrl,
  phone: phoneSchema,
  officeAddress: z.string().trim().min(5).max(300),
  areasServed: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  logoUrl: optionalUrl,
});

export async function updatePartnerProfile(actor: Actor, partnerId: string, input: z.input<typeof partnerProfileSchema>) {
  assertPartnerScope(actor, partnerId, "partner:edit");
  const data = partnerProfileSchema.parse(input);
  const before = await db.partner.findUnique({ where: { id: partnerId } });
  if (!before) throw notFound();
  const after = await db.partner.update({ where: { id: partnerId }, data });
  await audit({ actorId: actor.id, action: "partner.profile_updated", entityType: "Partner", entityId: partnerId, before, after });
  return after;
}

export async function updatePartnerInternalNotes(actor: Actor, partnerId: string, notes: string) {
  assertPermission(actor, "partner:edit");
  await db.partner.update({ where: { id: partnerId }, data: { internalNotes: notes.slice(0, 8000) } });
  await audit({ actorId: actor.id, action: "partner.notes_updated", entityType: "Partner", entityId: partnerId });
}

// ───────────── Agreements ─────────────

export const agreementSchema = z
  .object({
    partnerId: z.string().min(1),
    agreementDate: z.coerce.date(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    commissionType: z.enum(["PERCENTAGE", "FIXED"]),
    commissionRatePercent: z.coerce.number().min(0).max(100).optional(),
    fixedFeeNaira: z.coerce.number().min(0).optional(),
    attributionWindowDays: z.coerce.number().int().min(1).max(3650),
    paymentTermsDays: z.coerce.number().int().min(0).max(365),
    scope: z.enum(["ALL_PROPERTIES", "SELECTED_PROPERTIES"]).default("ALL_PROPERTIES"),
    cancellationRules: optionalText(4000),
    specialConditions: optionalText(4000),
    activate: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.commissionType === "PERCENTAGE" && (v.commissionRatePercent === undefined || v.commissionRatePercent <= 0)) {
      ctx.addIssue({ code: "custom", path: ["commissionRatePercent"], message: "Enter the commission percentage" });
    }
    if (v.commissionType === "FIXED" && (v.fixedFeeNaira === undefined || v.fixedFeeNaira <= 0)) {
      ctx.addIssue({ code: "custom", path: ["fixedFeeNaira"], message: "Enter the fixed fee" });
    }
    if (v.endDate && v.endDate <= v.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after start date" });
  });

export async function createAgreement(actor: Actor, input: z.input<typeof agreementSchema>) {
  assertPermission(actor, "agreement:manage");
  const data = agreementSchema.parse(input);
  const partner = await db.partner.findUnique({ where: { id: data.partnerId }, select: { id: true } });
  if (!partner) throw notFound();
  return db.$transaction(async (tx) => {
    if (data.activate) {
      // One active agreement per partner keeps commission resolution unambiguous.
      await tx.partnerAgreement.updateMany({ where: { partnerId: data.partnerId, status: "ACTIVE" }, data: { status: "EXPIRED" } });
    }
    const agreement = await tx.partnerAgreement.create({
      data: {
        partnerId: data.partnerId,
        reference: `YLA-${new Date().getFullYear()}-${randomCode(5)}`,
        agreementDate: data.agreementDate,
        startDate: data.startDate,
        endDate: data.endDate,
        commissionType: data.commissionType,
        commissionRateBps: data.commissionType === "PERCENTAGE" ? Math.round((data.commissionRatePercent ?? 0) * 100) : null,
        fixedFeeKobo: data.commissionType === "FIXED" ? BigInt(Math.round((data.fixedFeeNaira ?? 0) * 100)) : null,
        attributionWindowDays: data.attributionWindowDays,
        paymentTermsDays: data.paymentTermsDays,
        scope: data.scope,
        cancellationRules: data.cancellationRules,
        specialConditions: data.specialConditions,
        status: data.activate ? "ACTIVE" : "DRAFT",
        createdById: actor.id,
      },
    });
    await audit({ actorId: actor.id, action: "agreement.created", entityType: "PartnerAgreement", entityId: agreement.id, after: agreement }, tx);
    return agreement;
  });
}

export async function setAgreementStatus(actor: Actor, agreementId: string, status: "ACTIVE" | "TERMINATED" | "EXPIRED") {
  assertPermission(actor, "agreement:manage");
  const before = await db.partnerAgreement.findUnique({ where: { id: agreementId } });
  if (!before) throw notFound();
  return db.$transaction(async (tx) => {
    if (status === "ACTIVE") {
      await tx.partnerAgreement.updateMany({ where: { partnerId: before.partnerId, status: "ACTIVE", id: { not: agreementId } }, data: { status: "EXPIRED" } });
    }
    const after = await tx.partnerAgreement.update({ where: { id: agreementId }, data: { status } });
    await audit({ actorId: actor.id, action: `agreement.${status.toLowerCase()}`, entityType: "PartnerAgreement", entityId: agreementId, before, after }, tx);
    return after;
  });
}

/** The agreement in force for a partner at a moment in time. */
export async function activeAgreementFor(client: Prisma.TransactionClient | typeof db, partnerId: string, at = new Date()) {
  return client.partnerAgreement.findFirst({
    where: { partnerId, status: "ACTIVE", startDate: { lte: at }, OR: [{ endDate: null }, { endDate: { gte: at } }] },
    orderBy: { startDate: "desc" },
  });
}
