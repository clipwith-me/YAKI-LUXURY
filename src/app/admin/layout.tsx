import type { Metadata } from "next";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { requireStaffPage } from "@/server/auth/guards";
import { hasPermission, type Permission } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { humanize } from "@/lib/labels";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const NAV: Array<NavItem & { perm: Permission }> = [
  { href: "/admin", label: "Overview", icon: "Chart", perm: "dashboard:view" },
  { href: "/admin/analytics", label: "Analytics", icon: "Search", perm: "analytics:read" },
  { href: "/admin/revenue", label: "Revenue", icon: "Coins", perm: "revenue:read" },
  { href: "/admin/properties", label: "Properties", icon: "Building", perm: "property:review" },
  { href: "/admin/partners", label: "Partners", icon: "Key", perm: "partner:read" },
  { href: "/admin/leads", label: "Leads", icon: "User", perm: "lead:read" },
  { href: "/admin/viewings", label: "Viewings", icon: "Calendar", perm: "lead:read" },
  { href: "/admin/deals", label: "Deals", icon: "Home", perm: "lead:read" },
  { href: "/admin/commissions", label: "Commissions", icon: "Coins", perm: "commission:read" },
  { href: "/admin/risk", label: "Risk queue", icon: "Flag", perm: "risk:review" },
  { href: "/admin/documents", label: "Documents", icon: "Doc", perm: "document:review" },
  { href: "/admin/reviews", label: "Reviews", icon: "Sparkle", perm: "review:moderate" },
  { href: "/admin/journal", label: "Journal", icon: "Mail", perm: "content:manage" },
  { href: "/admin/users", label: "Users", icon: "User", perm: "user:manage" },
  { href: "/admin/settings", label: "Settings", icon: "Settings", perm: "settings:manage" },
  { href: "/admin/audit", label: "Audit log", icon: "Shield", perm: "audit:read" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  const [unread, pendingProps, newLeads, openFlags] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.property.count({ where: { status: "PENDING_REVIEW" } }),
    db.lead.count({ where: { status: "NEW" } }),
    db.riskFlag.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
  ]);
  const badges: Record<string, number> = { "/admin/properties": pendingProps, "/admin/leads": newLeads, "/admin/risk": openFlags };
  const nav = NAV.filter((n) => hasPermission(user.role, n.perm)).map(({ perm: _p, ...n }) => ({ ...n, badge: badges[n.href] }));
  nav.push({ href: "/admin/notifications", label: "Notifications", icon: "Bell", badge: unread });
  return <DashboardShell title="Administration" nav={nav} user={{ name: user.name, subtitle: humanize(user.role) }} unread={unread}>{children}</DashboardShell>;
}
