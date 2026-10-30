import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { requirePartnerPage } from "@/server/auth/guards";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Partner portal", robots: { index: false } };

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePartnerPage();
  const [partner, unread, newLeads] = await Promise.all([
    db.partner.findUniqueOrThrow({ where: { id: user.partnerId }, select: { companyName: true, status: true } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.lead.count({ where: { partnerId: user.partnerId, status: "NEW" } }),
  ]);
  return (
    <DashboardShell
      title="Partner portal"
      user={{ name: user.name, subtitle: `${partner.companyName} · ${partner.status.toLowerCase().replace("_", " ")}` }}
      unread={unread}
      nav={[
        { href: "/partner", label: "Overview", icon: "Chart" },
        { href: "/partner/properties", label: "Properties", icon: "Building" },
        { href: "/partner/properties/new", label: "Add property", icon: "Home" },
        { href: "/partner/leads", label: "Leads", icon: "User", badge: newLeads },
        { href: "/partner/viewings", label: "Viewings", icon: "Calendar" },
        { href: "/partner/deals", label: "Offers & deals", icon: "Key" },
        { href: "/partner/commissions", label: "Commission", icon: "Coins" },
        { href: "/partner/documents", label: "Documents", icon: "Doc" },
        { href: "/partner/profile", label: "Company profile", icon: "Settings" },
        { href: "/partner/notifications", label: "Notifications", icon: "Bell", badge: unread },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
