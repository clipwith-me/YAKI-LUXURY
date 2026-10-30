import { PageTitle } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/dashboard/table";
import { LeadWorkflow } from "@/components/dashboard/lead-workflow";
import { LeadTimeline } from "@/components/dashboard/lead-timeline";
import { Notice } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { getLeadForPartner } from "@/server/services/leads";
import { formatNaira } from "@/lib/money";
import { formatNigerianPhone } from "@/lib/phone";
import { humanize } from "@/lib/labels";

export default async function PartnerLead({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePartnerPage();
  const { id } = await params;
  const lead = await getLeadForPartner(toActor(user), id);
  return (
    <>
      <PageTitle title={`Lead ${lead.code}`} description={<span className="flex items-center gap-2">{lead.property?.title} <StatusBadge status={lead.status} /></span>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className="border border-stone-200 bg-white p-5">
            <h2 className="font-display text-xl">Client</h2>
            {lead.introduced ? (
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-stone-500">Name</dt><dd>{lead.customer.fullName}</dd></div>
                <div><dt className="text-stone-500">Phone</dt><dd>{lead.customer.phone ? <a href={`tel:${lead.customer.phone}`} className="underline">{formatNigerianPhone(lead.customer.phone)}</a> : "—"}</dd></div>
                <div><dt className="text-stone-500">Email</dt><dd>{lead.customer.email ? <a href={`mailto:${lead.customer.email}`} className="underline">{lead.customer.email}</a> : "—"}</dd></div>
              </dl>
            ) : (
              <Notice tone="brass" className="mt-3">Client {lead.customer.fullName} — contact details will be shared when YAKI introduces the client to you.</Notice>
            )}
            <p className="mt-4 text-xs text-stone-500">Enquiry type: {humanize(lead.type)} · Referred by YAKI&apos;S LUXE HOMES on {lead.createdAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}{lead.attribution && ` · referral protected until ${lead.attribution.protectedUntil.toLocaleDateString("en-NG", { dateStyle: "medium" })}`}</p>
          </div>
          {lead.commission && <Notice tone="neutral" title="Referral commission">{formatNaira(lead.commission.actualKobo ?? lead.commission.expectedKobo)} · {humanize(lead.commission.status)} · due {lead.commission.dueDate.toLocaleDateString("en-NG", { dateStyle: "medium" })}</Notice>}
          <LeadTimeline events={lead.events.map((e) => ({ id: e.id, type: e.type, body: e.body, createdAt: e.createdAt, actor: e.actor?.name ?? null }))} />
        </div>
        {lead.introduced ? (
          <LeadWorkflow leadId={lead.id} returnTo={`/partner/leads/${lead.id}`} staff={false} viewings={lead.viewings.map((v) => ({ id: v.id, status: v.status, mode: v.mode, scheduledAt: v.scheduledAt?.toISOString() ?? null }))} offers={lead.offers.map((o) => ({ id: o.id, status: o.status, amount: formatNaira(o.amountKobo) }))} deal={lead.deal ? { id: lead.deal.id, status: lead.deal.status, agreedPrice: formatNaira(lead.deal.agreedPriceKobo) } : null} />
        ) : <p className="text-sm text-stone-500">Actions become available after introduction.</p>}
      </div>
    </>
  );
}
