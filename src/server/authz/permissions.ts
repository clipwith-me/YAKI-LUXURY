import type { UserRole } from "@prisma/client";

/**
 * Central permission catalogue. Every staff capability is checked through here — never by
 * comparing role names in pages or services. Changing what a role can do is a one-line edit.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "analytics:read",
  "revenue:read",
  "property:review",
  "property:edit",
  "property:feature",
  "partner:read",
  "partner:review",
  "partner:edit",
  "agreement:manage",
  "verification:manage",
  "document:review",
  "lead:read",
  "lead:manage",
  "lead:assign",
  "lead:introduce",
  "deal:manage",
  "commission:read",
  "commission:manage",
  "content:manage",
  "review:moderate",
  "risk:review",
  "user:manage",
  "settings:manage",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  SUPER_ADMIN: ALL,
  ADMIN: new Set(PERMISSIONS.filter((p) => p !== "settings:manage")),
  PROPERTY_MANAGER: new Set<Permission>([
    "dashboard:view",
    "property:review",
    "property:edit",
    "property:feature",
    "partner:read",
    "verification:manage",
    "document:review",
    "risk:review",
  ]),
  LEAD_MANAGER: new Set<Permission>([
    "dashboard:view",
    "lead:read",
    "lead:manage",
    "lead:assign",
    "lead:introduce",
    "deal:manage",
    "partner:read",
    "commission:read",
    "risk:review",
  ]),
  PARTNER_MANAGER: new Set<Permission>([
    "dashboard:view",
    "partner:read",
    "partner:review",
    "partner:edit",
    "agreement:manage",
    "verification:manage",
    "document:review",
    "lead:read",
    "risk:review",
  ]),
  FINANCE: new Set<Permission>([
    "dashboard:view",
    "analytics:read",
    "revenue:read",
    "commission:read",
    "commission:manage",
    "partner:read",
    "lead:read",
    "agreement:manage",
  ]),
  CONTENT_MANAGER: new Set<Permission>(["dashboard:view", "content:manage", "review:moderate"]),
  SUPPORT: new Set<Permission>(["dashboard:view", "lead:read", "partner:read", "review:moderate"]),
  PARTNER: new Set<Permission>(),
  CUSTOMER: new Set<Permission>(),
};

export const STAFF_ROLES: readonly UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "PROPERTY_MANAGER",
  "LEAD_MANAGER",
  "PARTNER_MANAGER",
  "FINANCE",
  "CONTENT_MANAGER",
  "SUPPORT",
];

export function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
