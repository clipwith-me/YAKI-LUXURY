import type { UserRole } from "@prisma/client";
import { forbidden, DomainError } from "@/server/errors";
import { hasPermission, isStaff, type Permission } from "./permissions";

/** The authenticated principal every service call is made on behalf of. */
export type Actor = {
  id: string;
  role: UserRole;
  partnerIds: string[];
};

export function assertAuthenticated(actor: Actor | null | undefined): asserts actor is Actor {
  if (!actor) throw new DomainError("UNAUTHENTICATED", "Please sign in to continue.");
}

export function assertPermission(actor: Actor | null | undefined, permission: Permission): asserts actor is Actor {
  assertAuthenticated(actor);
  if (!hasPermission(actor.role, permission)) throw forbidden();
}

export function isPartnerMember(actor: Actor, partnerId: string): boolean {
  return actor.role === "PARTNER" && actor.partnerIds.includes(partnerId);
}

/** Partners may only touch their own organisation; staff need the given permission. */
export function assertPartnerScope(actor: Actor | null | undefined, partnerId: string, staffPermission: Permission): asserts actor is Actor {
  assertAuthenticated(actor);
  if (isPartnerMember(actor, partnerId)) return;
  if (isStaff(actor.role) && hasPermission(actor.role, staffPermission)) return;
  throw forbidden();
}

export const policies = {
  canReviewProperty: (a: Actor) => hasPermission(a.role, "property:review"),
  canReviewPartner: (a: Actor) => hasPermission(a.role, "partner:review"),
  canManageLead: (a: Actor) => hasPermission(a.role, "lead:manage"),
  canIntroduceLead: (a: Actor) => hasPermission(a.role, "lead:introduce"),
  canManageDeal: (a: Actor) => hasPermission(a.role, "deal:manage"),
  canManageCommission: (a: Actor) => hasPermission(a.role, "commission:manage"),
  canManageVerification: (a: Actor) => hasPermission(a.role, "verification:manage"),
  canReadRevenue: (a: Actor) => hasPermission(a.role, "revenue:read"),
};
