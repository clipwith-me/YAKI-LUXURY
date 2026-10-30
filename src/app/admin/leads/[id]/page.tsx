import Link from "next/link";
import { LeadStatus } from "@prisma/client";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/dashboard/table";
import { LeadWorkflow } from "@/components/dashboard/lead-workflow";
import { LeadTimeline } from "@/components/dashboard/lead-timeline";
import { LeadStatusForm, FlagForm } from "@/components/admin/forms";
import { assignLeadAction, introduceLeadAction } from "@/app/actions/admin";
import { Notice, Button } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { hasPermission, STAFF_ROLES, ROLE_PERMISSIONS } from "@/server/authz/permissions";
import { getLeadForStaff } from "@/server/services/leads";
import { isManualStatusAllowed } from "@/server/domain/lead-pipeline";
import { db } from "@/server/db";
import { formatNaira } from "@/lib/money";
import { formatNigerianPhone } from "@/lib/phone";
import { humanize } from "@/lib/labels";

export default async function AdminLead({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage("lead:read");
  const { id } = await params;
  const lead = await getLeadForStaff(toActor(user), id);
  const returnTo = `/admin/leads/${id}`;
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(user.role, p);
  const assignees = await db.user.findMany({ where: { status: "ACTIVE", role: { in: STAFF_ROLES.filter((r) => ROLE_PERMISSIONS[r].has("lead:manage")) } }, select: { id: true, name: true } });
  const a = lead.attribution;
  return (
    <>
      <PageTitle title={`Lead ${lead.code}`} description={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={lead.status} /> {humanize(lead.type)} · {lead.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>} action={<Link href={`/admin/leads/${id}/evidence`} className="text-sm underline">Attribution evidence</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <section className="grid gap-6 border border-stone-200 bg-white p-5 md:grid-cols-2">
            <div>
              <h2 className="font-display text-xl">Client</h2>
              <p className="mt-2 text-sm">{lead.customer.fullName}</p>
              <p className="text-sm">{lead.customer.phone ? <a href={`tel:${lead.customer.phone}`} className="underline">{formatNigerianPhone(lead.customer.phone)}</a> : "—"}</p>
              <p className="text-sm"><a href={`mailto:${lead.customer.email}`} className="underline">{lead.customer.email}</a></p>
              <p className="mt-2 text-xs text-stone-500">Prefers {humanize(lead.preferredContact)}{lead.preferredViewingAt && ` · preferred viewing ${lead.preferredViewingAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`}</p>
              {lead.message && <p className="mt-3 whitespace-pre-line border-l-2 border-brass-300 pl-3 text-sm text-stone-700">{lead.message}</p>}
            </div>
            <div>
              <h2 className="font-display text-xl">Property & partner</h2>
              {lead.property ? (
                <>
                  <Link href={`/admin/properties/${lead.property.id}`} className="mt-2 block text-sm underline">{lead.property.title}</Link>
                  <p className="text-xs text-stone-500">{lead.property.reference} · {formatNaira(lead.property.priceKobo)}</p>
                  {lead.partner && <Link href={`/admin/partners/${lead.partner.id}`} className="mt-1 block text-sm underline">{lead.partner.companyName}</Link>}
                </>
              ) : <p className="mt-2 text-sm text-stone-500">General enquiry — no property.</p>}
              {a && <p className="mt-3 text-xs text-stone-500">Referral protected until <strong>{a.protectedUntil.toLocaleDateString("en-NG", { dateStyle: "medium" })}</strong> ({a.attributionWindowDays} days{a.agreement && `, agreement ${a.agreement.reference}`}) · source {a.utmSource ?? humanize(lead.source)}</p>}
            </div>
          </section>

          {lead.partnerId && !lead.introducedToPartnerAt && can("lead:introduce") && (
            <Notice tone="brass" title="Not yet introduced">
              The partner knows a lead exists but can&apos;t see the client&apos;s details. Introduce once you&apos;ve qualified the client and have their consent (given on the enquiry form).
              <form action={introduceLeadAction} className="mt-3"><input type="hidden" name="id" value={lead.id} /><input type="hidden" name="returnTo" value={returnTo} /><Button size="sm">Introduce client to partner</Button></form>
            </Notice>
          )}

          <section className="flex flex-wrap items-end gap-6 border border-stone-200 bg-white p-5">
            {can("lead:manage") && <div><p className="mb-2 text-xs uppercase tracking-wider text-stone-500">Pipeline status</p><LeadStatusForm id={lead.id} returnTo={returnTo} current={lead.status} statuses={Object.values(LeadStatus).filter(isManualStatusAllowed)} /></div>}
            {can("lead:assign") && (
              <form action={assignLeadAction} className="flex items-end gap-2"><input type="hidden" name="id" value={lead.id} /><input type="hidden" name="returnTo" value={returnTo} />
                <label className="text-xs uppercase tracking-wider text-stone-500">Assigned to<select name="assigneeId" defaultValue={lead.assignedToId ?? ""} className="mt-2 block h-11 border border-stone-300 bg-white px-2 text-sm normal-case tracking-normal"><option value="">Unassigned</option>{assignees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
                <Button size="sm" variant="outline" className="h-11">Assign</Button>
              </form>
            )}
          </section>

          {lead.commission && (
            <Notice tone="neutral" title="Commission">
              {formatNaira(lead.commission.actualKobo ?? lead.commission.expectedKobo)} · {humanize(lead.commission.status)} · paid {formatNaira(lead.commission.paidKobo)} · <Link href={`/admin/commissions/${lead.commission.id}`} className="underline">Open</Link>
            </Notice>
          )}
          <LeadTimeline events={lead.events.map((e) => ({ id: e.id, type: e.type, body: e.body, createdAt: e.createdAt, actor: e.actor?.name ?? null, internal: !e.partnerVisible }))} />
          {can("risk:review") && <div className="border border-stone-200 bg-white p-5"><h2 className="mb-3 font-display text-xl">Flag this lead</h2><FlagForm subjectType="LEAD" subjectId={lead.id} returnTo={returnTo} /></div>}
        </div>
        {can("lead:manage") && lead.propertyId ? (
          lead.introducedToPartnerAt ? (
            <LeadWorkflow leadId={lead.id} returnTo={returnTo} staff viewings={lead.viewings.map((v) => ({ id: v.id, status: v.status, mode: v.mode, scheduledAt: v.scheduledAt?.toISOString() ?? null }))} offers={lead.offers.map((o) => ({ id: o.id, status: o.status, amount: formatNaira(o.amountKobo) }))} deal={lead.deal ? { id: lead.deal.id, status: lead.deal.status, agreedPrice: formatNaira(lead.deal.agreedPriceKobo) } : null} />
          ) : <p className="text-sm text-stone-500">Introduce the client to unlock viewing, offer and deal tracking.</p>
        ) : null}
      </div>
    </>
  );
}
