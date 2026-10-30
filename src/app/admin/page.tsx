import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { Funnel } from "@/components/dashboard/charts";
import { Stat } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { adminOverview } from "@/server/services/insights";
import { hasPermission } from "@/server/authz/permissions";
import { formatNaira } from "@/lib/money";

export default async function AdminHome() {
  const user = await requireStaffPage("dashboard:view");
  const o = await adminOverview(toActor(user));
  const money = hasPermission(user.role, "commission:read");
  const q = o.queues;
  return (
    <>
      <PageTitle title="Overview" description={`Live figures from platform records · last ${o.days} days where noted.`} />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Listings awaiting review", q.pendingReview, "/admin/properties"], ["Partner applications", q.pendingPartners, "/admin/partners?status=PENDING"], ["Open risk flags", q.openFlags, "/admin/risk"], ["Follow-ups due", q.followUpsDue, "/admin/leads"]].map(([l, v, h]) => (
          <Link key={l as string} href={h as string} className={`flex items-center justify-between border px-4 py-3 text-sm ${Number(v) > 0 ? "border-brass-300 bg-brass-50" : "border-stone-200 bg-white"}`}><span>{l}</span><span className="font-display text-2xl">{v}</span></Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Live properties" value={o.propertiesByStatus.PUBLISHED ?? 0} hint={`${o.propertiesByStatus.PENDING_REVIEW ?? 0} pending`} />
        <Stat label="Approved partners" value={o.partnersByStatus.APPROVED ?? 0} />
        <Stat label="Customers" value={o.customers} />
        <Stat label="Leads" value={o.leadsTotal} hint={`${o.leadsPeriod} in ${o.days}d · ${o.leadsNew} new`} />
        <Stat label="Viewings completed" value={o.viewingsCompleted} />
        <Stat label="Offers" value={o.offers} />
        <Stat label="Deals closed" value={o.dealsClosed} />
        {money ? <Stat label="Commission (expected)" value={formatNaira(o.commissionExpected)} hint={`${formatNaira(o.commissionPaid)} received`} /> : <Stat label="Property views" value={o.views} hint={`${o.days}d`} />}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-stone-200 bg-white p-6">
          <h2 className="mb-5 font-display text-2xl">Conversion funnel</h2>
          <Funnel steps={[{ label: "Leads", value: o.funnel.leads }, { label: "Viewings completed", value: o.funnel.viewings, rate: o.funnel.leadToViewing }, { label: "Offers", value: o.funnel.offers, rate: o.funnel.viewingToOffer }, { label: "Deals closed", value: o.funnel.deals, rate: o.funnel.offerToDeal }]} />
          <p className="mt-4 text-xs text-stone-500">Overall lead → deal: {o.funnel.leadToDeal === null ? "—" : `${o.funnel.leadToDeal}%`}</p>
        </div>
        <div className="border border-stone-200 bg-white p-6">
          <h2 className="mb-5 font-display text-2xl">Traffic ({o.days} days)</h2>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div><dt className="text-xs text-stone-500">Property views</dt><dd className="font-display text-3xl">{o.views}</dd></div>
            <div><dt className="text-xs text-stone-500">Unique visitors</dt><dd className="font-display text-3xl">{o.uniqueVisitors}</dd></div>
            <div><dt className="text-xs text-stone-500">Searches</dt><dd className="font-display text-3xl">{o.searches}</dd></div>
          </dl>
          <Link href="/admin/analytics" className="mt-6 block text-sm underline">Full analytics →</Link>
        </div>
      </div>
    </>
  );
}
