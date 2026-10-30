import { ReviewStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { assertAuthenticated, assertPermission, type Actor } from "@/server/authz/policies";
import { DomainError, notFound } from "@/server/errors";
import { getSetting } from "@/server/settings";

export const reviewSchema = z.object({
  subjectType: z.enum(["PROPERTY", "PARTNER", "SERVICE"]),
  subjectId: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(20, "Tell us a little more (20+ characters)").max(3000),
});

/**
 * Reviews are off until enabled in settings. Only customers with a lead on the subject can review,
 * and everything is held for moderation before it can appear publicly.
 */
export async function submitReview(actor: Actor, input: z.input<typeof reviewSchema>) {
  assertAuthenticated(actor);
  if (!(await getSetting("features.publicReviews"))) throw new DomainError("FORBIDDEN", "Reviews are not open yet.");
  const data = reviewSchema.parse(input);
  const leadWhere =
    data.subjectType === "PROPERTY" ? { propertyId: data.subjectId } : data.subjectType === "PARTNER" ? { partnerId: data.subjectId } : {};
  const hasRelationship = await db.lead.findFirst({ where: { customer: { userId: actor.id }, ...leadWhere }, select: { id: true } });
  if (!hasRelationship) throw new DomainError("FORBIDDEN", "You can review once you've enquired through YAKI'S LUXE HOMES.");
  return db.review.create({
    data: {
      subjectType: data.subjectType,
      propertyId: data.subjectType === "PROPERTY" ? data.subjectId : null,
      partnerId: data.subjectType === "PARTNER" ? data.subjectId : null,
      authorId: actor.id,
      rating: data.rating,
      title: data.title,
      body: data.body,
    },
  });
}

export async function moderateReview(actor: Actor, reviewId: string, status: Exclude<ReviewStatus, "PENDING">, note?: string) {
  assertPermission(actor, "review:moderate");
  const before = await db.review.findUnique({ where: { id: reviewId } });
  if (!before) throw notFound();
  const after = await db.review.update({ where: { id: reviewId }, data: { status, moderatedById: actor.id, moderatedAt: new Date(), moderationNote: note } });
  await audit({ actorId: actor.id, action: `review.${status.toLowerCase()}`, entityType: "Review", entityId: reviewId, before: { status: before.status }, after: { status, note } });
  return after;
}

export async function approvedServiceReviews(limit = 6) {
  return db.review.findMany({
    where: { status: "APPROVED", subjectType: "SERVICE" },
    select: { id: true, rating: true, title: true, body: true, createdAt: true, author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
