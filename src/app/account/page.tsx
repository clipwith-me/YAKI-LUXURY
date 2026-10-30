import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { Stat, ButtonLink } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";

export default async function AccountHome() {
  const user = await requireUser("/account");
  const [saved, leads, viewings, alerts] = await Promise.all([
    db.favorite.count({ where: { userId: user.id } }),
    db.lead.count({ where: { customer: { userId: user.id } } }),
    db.viewing.count({ where: { lead: { customer: { userId: user.id } }, status: "SCHEDULED" } }),
    db.propertyAlert.count({ where: { userId: user.id, isActive: true } }),
  ]);
  return (
    <>
      <PageTitle title={`Welcome, ${user.name.split(" ")[0]}`} description="Your homes, enquiries and alerts in one place." action={<ButtonLink href="/properties">Explore properties</ButtonLink>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/account/saved"><Stat label="Saved properties" value={saved} /></Link>
        <Link href="/account/enquiries"><Stat label="Enquiries" value={leads} /></Link>
        <Link href="/account/enquiries"><Stat label="Upcoming viewings" value={viewings} /></Link>
        <Link href="/account/alerts"><Stat label="Active alerts" value={alerts} /></Link>
      </div>
      {saved > 1 && <p className="mt-8 text-sm text-stone-600">Tip: tap “Compare” on your saved homes to see them side by side.</p>}
    </>
  );
}
