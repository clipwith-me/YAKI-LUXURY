import { Availability, ListingType, PricePeriod, PropertyType, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { assertPartnerScope, assertPermission, isPartnerMember, type Actor } from "@/server/authz/policies";
import { hasPermission } from "@/server/authz/permissions";
import { DomainError, forbidden, invalidState, notFound } from "@/server/errors";
import { notifyUsers, partnerUserIds, staffWithPermission } from "@/server/notifications/notify";
import { raiseFlag } from "@/server/services/risk";
import { activeBadgeWhere } from "@/server/services/verification";
import { AMENITY_KEYS } from "@/server/search/filters";
import { checkbox, nairaSchema, optionalText, optionalUrl } from "@/server/validation/common";
import { propertyReference, randomCode } from "@/lib/ids";
import { slugify } from "@/lib/slug";

/** A property is public only when it is published AND its partner is approved. One definition, used everywhere. */
export function publicPropertyWhere(): Prisma.PropertyWhereInput {
  return { status: "PUBLISHED", deletedAt: null, partner: { status: "APPROVED", deletedAt: null } };
}

const imageUrl = z.string().trim().url().max(1000).refine((v) => v.startsWith("https://") || v.startsWith("/media/"), "Images must be https links or uploaded files");

export const propertyInputSchema = z
  .object({
    title: z.string().trim().min(8, "Use a descriptive title (8+ characters)").max(140),
    description: z.string().trim().min(40, "Describe the property in at least 40 characters").max(8000),
    listingType: z.nativeEnum(ListingType),
    propertyType: z.nativeEnum(PropertyType),
    locationId: z.string().min(1, "Choose a location"),
    addressLine: z.string().trim().min(5, "Enter the address (kept private by default)").max(300),
    price: nairaSchema,
    pricePeriod: z.nativeEnum(PricePeriod).default("TOTAL"),
    priceOnRequest: checkbox,
    bedrooms: z.coerce.number().int().min(0).max(50),
    bathrooms: z.coerce.number().int().min(0).max(50),
    sizeSqm: z.coerce.number().int().min(1).max(1_000_000).optional().or(z.literal("").transform(() => undefined)),
    plotSizeSqm: z.coerce.number().int().min(1).max(10_000_000).optional().or(z.literal("").transform(() => undefined)),
    parkingSpaces: z.coerce.number().int().min(0).max(100).optional().or(z.literal("").transform(() => undefined)),
    furnished: checkbox,
    serviced: checkbox,
    offPlan: checkbox,
    newConstruction: checkbox,
    availability: z.nativeEnum(Availability).default("AVAILABLE"),
    developmentName: optionalText(140),
    developerName: optionalText(140),
    completionDate: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
    partnerReference: optionalText(60),
    documentationInfo: optionalText(2000),
    videoUrl: optionalUrl,
    virtualTourUrl: optionalUrl,
    floorPlanUrl: optionalUrl,
    features: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    amenities: z.array(z.enum(AMENITY_KEYS)).max(AMENITY_KEYS.length).default([]),
    imageUrls: z.array(imageUrl).max(30).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.listingType === "SALE" && v.pricePeriod !== "TOTAL") {
      ctx.addIssue({ code: "custom", path: ["pricePeriod"], message: "Sale prices are a total amount" });
    }
    if (!v.priceOnRequest && v.price <= 0n) ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price or mark it as price on request" });
  });
export type PropertyInput = z.input<typeof propertyInputSchema>;

async function assertApprovedPartner(partnerId: string) {
  const partner = await db.partner.findUnique({ where: { id: partnerId }, select: { status: true } });
  if (!partner) throw notFound();
  if (partner.status !== "APPROVED") {
    throw invalidState("Your partner account must be approved before you can submit properties.");
  }
}

async function uniqueSlug(title: string, locationId: string): Promise<string> {
  const loc = await db.location.findUnique({ where: { id: locationId }, select: { slug: true } });
  const base = slugify(`${title} ${loc?.slug ?? ""}`) || "property";
  return `${base}-${randomCode(4).toLowerCase()}`;
}

function toPropertyData(data: z.output<typeof propertyInputSchema>) {
  const { amenities: _a, imageUrls: _i, price, ...rest } = data;
  return { ...rest, priceKobo: price };
}

/**
 * Creates a listing for the caller's partner. Partners can never publish directly: `submit`
 * moves it to PENDING_REVIEW. Mass assignment of status/partnerId/featured/commission is blocked by
 * the schema — those fields are not accepted from partners at all.
 */
export async function createProperty(actor: Actor, partnerId: string, input: PropertyInput, opts: { submit: boolean }) {
  assertPartnerScope(actor, partnerId, "property:edit");
  if (isPartnerMember(actor, partnerId)) await assertApprovedPartner(partnerId);
  const data = propertyInputSchema.parse(input);
  const location = await db.location.findFirst({ where: { id: data.locationId, type: "AREA", isActive: true }, include: { parent: true } });
  if (!location) throw new DomainError("VALIDATION", "Choose a valid area.", { locationId: ["Invalid location"] });

  const amenityRows = await db.amenity.findMany({ where: { key: { in: data.amenities } }, select: { id: true } });
  const slug = await uniqueSlug(data.title, data.locationId);

  const property = await db.$transaction(async (tx) => {
    const created = await tx.property.create({
      data: {
        ...toPropertyData(data),
        reference: propertyReference(),
        slug,
        partnerId,
        lat: location.lat,
        lng: location.lng,
        status: opts.submit ? "PENDING_REVIEW" : "DRAFT",
        submittedAt: opts.submit ? new Date() : null,
        amenities: { create: amenityRows.map((a) => ({ amenityId: a.id })) },
        images: { create: data.imageUrls.map((url, i) => ({ url, alt: `${data.title} — photo ${i + 1}`, sortOrder: i, isCover: i === 0 })) },
      },
    });
    await detectDuplicateListing(tx, created.id, partnerId, data.addressLine, data.title);
    await audit({ actorId: actor.id, action: opts.submit ? "property.submitted" : "property.drafted", entityType: "Property", entityId: created.id, after: { title: created.title, status: created.status } }, tx);
    if (opts.submit) await notifyReviewers(tx, created.id, created.title);
    return created;
  });
  return property;
}

export async function updateProperty(actor: Actor, propertyId: string, input: PropertyInput, opts: { submit: boolean }) {
  const before = await db.property.findUnique({ where: { id: propertyId } });
  if (!before || before.deletedAt) throw notFound();
  assertPartnerScope(actor, before.partnerId, "property:edit");
  const asPartner = isPartnerMember(actor, before.partnerId);
  if (asPartner) await assertApprovedPartner(before.partnerId);
  const data = propertyInputSchema.parse(input);
  const amenityRows = await db.amenity.findMany({ where: { key: { in: data.amenities } }, select: { id: true } });
  const location = await db.location.findFirst({ where: { id: data.locationId, type: "AREA" } });
  if (!location) throw new DomainError("VALIDATION", "Choose a valid area.", { locationId: ["Invalid location"] });

  // A partner edit to a live listing sends it back to review so nothing unreviewed goes public.
  const nextStatus = asPartner ? (opts.submit ? "PENDING_REVIEW" : before.status === "PUBLISHED" ? "PENDING_REVIEW" : "DRAFT") : before.status;

  return db.$transaction(async (tx) => {
    await tx.propertyAmenity.deleteMany({ where: { propertyId } });
    await tx.propertyImage.deleteMany({ where: { propertyId } });
    const after = await tx.property.update({
      where: { id: propertyId },
      data: {
        ...toPropertyData(data),
        lat: location.lat,
        lng: location.lng,
        status: nextStatus,
        submittedAt: nextStatus === "PENDING_REVIEW" ? new Date() : before.submittedAt,
        amenities: { create: amenityRows.map((a) => ({ amenityId: a.id })) },
        images: { create: data.imageUrls.map((url, i) => ({ url, alt: `${data.title} — photo ${i + 1}`, sortOrder: i, isCover: i === 0 })) },
      },
    });
    await audit({ actorId: actor.id, action: "property.updated", entityType: "Property", entityId: propertyId, before: { status: before.status, title: before.title, priceKobo: before.priceKobo }, after: { status: after.status, title: after.title, priceKobo: after.priceKobo } }, tx);
    if (nextStatus === "PENDING_REVIEW" && before.status !== "PENDING_REVIEW") await notifyReviewers(tx, propertyId, after.title);
    return after;
  });
}

async function notifyReviewers(tx: Prisma.TransactionClient, propertyId: string, title: string) {
  const reviewers = await staffWithPermission(tx, "property:review");
  await notifyUsers(tx, reviewers, { type: "property.submitted", title: "Property awaiting review", body: title, link: `/admin/properties/${propertyId}` });
}

async function detectDuplicateListing(tx: Prisma.TransactionClient, propertyId: string, partnerId: string, address: string, title: string) {
  const dup = await tx.property.findFirst({
    where: {
      id: { not: propertyId },
      deletedAt: null,
      status: { notIn: ["REJECTED", "ARCHIVED"] },
      OR: [{ addressLine: { equals: address, mode: "insensitive" } }, { partnerId, title: { equals: title, mode: "insensitive" } }],
    },
    select: { id: true, reference: true },
  });
  if (dup) {
    await raiseFlag(tx, { subjectType: "PROPERTY", subjectId: propertyId, reason: "DUPLICATE_LISTING", details: `Matches existing listing ${dup.reference}` });
  }
}

export const reviewDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES"]),
  note: z.string().trim().max(2000).optional(),
});

/** Admin review. Approval publishes immediately; rejections and change requests require a note. */
export async function reviewProperty(actor: Actor, propertyId: string, input: z.input<typeof reviewDecisionSchema>) {
  assertPermission(actor, "property:review");
  const { decision, note } = reviewDecisionSchema.parse(input);
  const before = await db.property.findUnique({ where: { id: propertyId }, include: { partner: { select: { status: true } }, location: { select: { path: true } } } });
  if (!before || before.deletedAt) throw notFound();
  if (before.status !== "PENDING_REVIEW") throw invalidState("Only properties pending review can be reviewed.");
  if (decision !== "APPROVE" && !note) throw new DomainError("VALIDATION", "Tell the partner what needs to change.", { note: ["Required"] });
  if (decision === "APPROVE" && before.partner.status !== "APPROVED") throw invalidState("Approve the partner before publishing their listings.");

  const status = decision === "APPROVE" ? "PUBLISHED" : decision === "REJECT" ? "REJECTED" : "CHANGES_REQUESTED";
  const after = await db.$transaction(async (tx) => {
    const updated = await tx.property.update({
      where: { id: propertyId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: actor.id,
        reviewNote: note ?? null,
        publishedAt: status === "PUBLISHED" ? before.publishedAt ?? new Date() : before.publishedAt,
      },
    });
    await audit({ actorId: actor.id, action: `property.${decision.toLowerCase()}`, entityType: "Property", entityId: propertyId, before: { status: before.status }, after: { status, note } }, tx);
    const members = await partnerUserIds(tx, before.partnerId);
    await notifyUsers(tx, members, {
      type: status === "PUBLISHED" ? "property.approved" : status === "REJECTED" ? "property.rejected" : "property.changes_requested",
      title: status === "PUBLISHED" ? "Your property is live" : status === "REJECTED" ? "Property not approved" : "Changes requested on your property",
      body: note ? `${before.title}: ${note}` : before.title,
      link: `/partner/properties/${propertyId}`,
    });
    return updated;
  });
  safeRevalidate(["/", "/properties", `/properties/${before.location.path}/${before.slug}`]);
  return after;
}

/** Staff-only listing controls that partners must never set themselves. */
export const adminListingSchema = z.object({
  featured: checkbox,
  isLuxury: checkbox,
  showExactAddress: checkbox,
  availability: z.nativeEnum(Availability),
  commissionType: z.enum(["PERCENTAGE", "FIXED", ""]).optional().transform((v) => (v ? v : null)),
  commissionRatePercent: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined)),
  fixedFeeNaira: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  listingExpiresAt: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
});

export async function updateListingControls(actor: Actor, propertyId: string, input: z.input<typeof adminListingSchema>) {
  assertPermission(actor, "property:feature");
  const data = adminListingSchema.parse(input);
  const before = await db.property.findUnique({ where: { id: propertyId } });
  if (!before) throw notFound();
  if (data.commissionType && !hasPermission(actor.role, "commission:manage")) throw forbidden("Only finance or admins can set commission overrides.");
  const after = await db.property.update({
    where: { id: propertyId },
    data: {
      featured: data.featured,
      isLuxury: data.isLuxury,
      showExactAddress: data.showExactAddress,
      availability: data.availability,
      listingExpiresAt: data.listingExpiresAt ?? null,
      commissionType: data.commissionType,
      commissionRateBps: data.commissionType === "PERCENTAGE" && data.commissionRatePercent !== undefined ? Math.round(data.commissionRatePercent * 100) : null,
      fixedFeeKobo: data.commissionType === "FIXED" && data.fixedFeeNaira !== undefined ? BigInt(Math.round(data.fixedFeeNaira * 100)) : null,
    },
  });
  await audit({ actorId: actor.id, action: "property.controls_updated", entityType: "Property", entityId: propertyId, before, after });
  safeRevalidate(["/", "/properties"]);
  return after;
}

export async function archiveProperty(actor: Actor, propertyId: string) {
  const before = await db.property.findUnique({ where: { id: propertyId } });
  if (!before) throw notFound();
  assertPartnerScope(actor, before.partnerId, "property:edit");
  await db.property.update({ where: { id: propertyId }, data: { status: "ARCHIVED" } });
  await audit({ actorId: actor.id, action: "property.archived", entityType: "Property", entityId: propertyId, before: { status: before.status }, after: { status: "ARCHIVED" } });
  safeRevalidate(["/", "/properties"]);
}

function safeRevalidate(paths: string[]) {
  // revalidatePath throws outside a Next.js request (tests, scripts); that's fine to ignore.
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      /* not in a Next request context */
    }
  }
}

export const propertyCardSelect = {
  id: true,
  slug: true,
  reference: true,
  title: true,
  listingType: true,
  propertyType: true,
  priceKobo: true,
  pricePeriod: true,
  priceOnRequest: true,
  bedrooms: true,
  bathrooms: true,
  sizeSqm: true,
  isLuxury: true,
  offPlan: true,
  newConstruction: true,
  furnished: true,
  serviced: true,
  availability: true,
  isDemo: true,
  lat: true,
  lng: true,
  publishedAt: true,
  location: { select: { name: true, path: true, parent: { select: { name: true } } } },
  partner: { select: { companyName: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
  verifications: { where: activeBadgeWhere(), select: { category: true, verifiedAt: true, publicNote: true } },
} satisfies Prisma.PropertySelect;

export type PropertyCardData = Prisma.PropertyGetPayload<{ select: typeof propertyCardSelect }>;
