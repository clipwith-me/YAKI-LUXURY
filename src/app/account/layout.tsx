import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  if (user.role === "PARTNER") redirect("/partner");
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <DashboardShell
      title="My account"
      user={{ name: user.name, subtitle: user.email }}
      unread={unread}
      nav={[
        { href: "/account", label: "Overview", icon: "Home" },
        { href: "/account/saved", label: "Saved properties", icon: "Heart" },
        { href: "/account/viewed", label: "Recently viewed", icon: "Search" },
        { href: "/account/enquiries", label: "Enquiries & viewings", icon: "Calendar" },
        { href: "/account/alerts", label: "Alerts", icon: "Bell" },
        { href: "/account/notifications", label: "Notifications", icon: "Mail", badge: unread },
        { href: "/account/profile", label: "Profile & preferences", icon: "User" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
