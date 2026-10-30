import type { FlagStatus, FlagSubject } from "@prisma/client";
import { db, type DbClient } from "@/server/db";
import { audit } from "@/server/audit";
import { assertPermission, type Actor } from "@/server/authz/policies";
import { notFound } from "@/server/errors";

/**
 * Deterministic, explainable risk rules. A flag is a signal for human review — never an
 * automatic accusation, block or public label.
 */
export const RISK_REASONS = {
  DUPLICATE_LISTING: "Another listing has the same address or title",
  REPEATED_PHONE: "The same phone number submitted many enquiries in 24 hours",
  DUPLICATE_PARTNER: "A partner with the same registration number or email already exists",
  PRICE_OUTLIER: "Price is far outside the range for the area",
  STAFF_REPORTED: "Raised by a staff member",
} as const;
export type RiskReason = keyof typeof RISK_REASONS;

export async function raiseFlag(
  client: DbClient,
  input: { subjectType: FlagSubject; subjectId: string; reason: RiskReason; details?: string; raisedById?: string },
): Promise<void> {
  // One open flag per subject+reason keeps the queue clean.
  const existing = await client.riskFlag.findFirst({
    where: { subjectType: input.subjectType, subjectId: input.subjectId, reason: input.reason, status: { in: ["OPEN", "INVESTIGATING"] } },
    select: { id: true },
  });
  if (existing) return;
  await client.riskFlag.create({
    data: {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      reason: input.reason,
      details: input.details,
      source: input.raisedById ? "STAFF" : "SYSTEM",
      raisedById: input.raisedById,
    },
  });
}

export async function flagByStaff(actor: Actor, subjectType: FlagSubject, subjectId: string, details: string) {
  assertPermission(actor, "risk:review");
  await raiseFlag(db, { subjectType, subjectId, reason: "STAFF_REPORTED", details, raisedById: actor.id });
  await audit({ actorId: actor.id, action: "risk.flagged", entityType: subjectType, entityId: subjectId, after: { details } });
}

export async function resolveFlag(actor: Actor, id: string, status: Exclude<FlagStatus, "OPEN">, resolution?: string) {
  assertPermission(actor, "risk:review");
  const before = await db.riskFlag.findUnique({ where: { id } });
  if (!before) throw notFound();
  const done = status === "RESOLVED" || status === "DISMISSED";
  const after = await db.riskFlag.update({
    where: { id },
    data: { status, resolution, resolvedById: done ? actor.id : null, resolvedAt: done ? new Date() : null },
  });
  await audit({ actorId: actor.id, action: `risk.${status.toLowerCase()}`, entityType: "RiskFlag", entityId: id, before, after });
}

export async function openFlagCount(): Promise<number> {
  return db.riskFlag.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } });
}
