import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/dashboard/table";
import { Notice, Stat, ButtonLink } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { partnerOverview } from "@/server/services/insights";
import { db } from "@/server/db";
import { formatNaira } from "@/lib/money";

export default async function PartnerHome({ searchParams }: { searchParams: Promise<{ applied?: string }> }) {
  const user = await requirePartnerPage();
  const { applied } = await searchParams;
  const partner = await db.partner.findUniqueOrThrow({ where: { id: user.partnerId }, select: { status: true, statusReason: true, companyName: true } });
  const stats = await partnerOverview(toActor(user), user.partnerId);
  const recent = await db.lead.findMany({ where: { partnerId: user.partnerId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, code: true, status: true, createdAt: true, property: { select: { title: true } } } });
  return (
    <>
      <PageTitle title={partner.companyName} description="Your listings, leads and referrals at a glance." action={partner.status === "APPROVED" && <ButtonLink href="/partner/properties/new">Add property</ButtonLink>} />
      {applied && <Notice tone="trust" className="mb-6" title="Application received">Thank you. Our partner team will review your application. You can upload company documents now to speed things up.</Notice>}
      {partner.status !== "APPROVED" && (
        <Notice tone={partner.status === "REJECTED" || partner.status === "SUSPENDED" ? "danger" : "warning"} className="mb-6" title={`Account status: ${partner.status.toLowerCase().replace("_", " ")}`}>
          {partner.status === "PENDING" || partner.status === "UNDER_REVIEW" ? <>You can submit listings once approved. Meanwhile, <Link href="/partner/documents" className="underline">upload your registration documents</Link> and complete your <Link href="/partner/profile" className="underline">company profile</Link>.</> : partner.statusReason ?? "Please contact our partner team."}
        </Notice>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total listings" value={stats.total} hint={`${stats.pending} pending review`} />
        <Stat label="Active listings" value={stats.active} />
        <Stat label="Property views (30d)" value={stats.views30} />
        <Stat label="Leads" value={stats.leads} hint={`${stats.leads30} in the last 30 days`} />
        <Stat label="Viewings" value={stats.viewings} />
        <Stat label="Deals closed" value={stats.deals} />
        <Stat label="Expected commission" value={formatNaira(stats.commissionExpected)} />
        <Stat label="Commission paid" value={formatNaira(stats.commissionPaid)} />
      </div>
      <h2 className="mb-3 mt-10 text-2xl">Recent leads</h2>
      {recent.length === 0 ? <p className="text-sm text-stone-600">No new leads yet.</p> : (
        <ul className="divide-y divide-stone-100 border border-stone-200 bg-white">
          {recent.map((l) => <li key={l.id}><Link href={`/partner/leads/${l.id}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-stone-50"><span><span className="font-mono text-xs text-stone-500">{l.code}</span> · {l.property?.title}</span><StatusBadge status={l.status} /></Link></li>)}
        </ul>
      )}
    </>
  );
}
