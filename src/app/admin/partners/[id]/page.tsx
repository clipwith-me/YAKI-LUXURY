import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/dashboard/table";
import { PartnerStatusForm, NotesForm, AgreementForm, VerificationForm, FlagForm } from "@/components/admin/forms";
import { agreementStatusAction, reviewDocumentAction, verificationStatusAction } from "@/app/actions/admin";
import { Notice } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { hasPermission } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { getAllSettings } from "@/server/settings";
import { BADGE_COPY } from "@/server/services/verification";
import { formatNaira, bpsToPercent } from "@/lib/money";
import { formatNigerianPhone } from "@/lib/phone";
import { humanize } from "@/lib/labels";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-stone-200 bg-white p-5"><h2 className="mb-4 font-display text-xl">{title}</h2>{children}</section>;
}

export default async function AdminPartner({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage("partner:read");
  const { id } = await params;
  const p = await db.partner.findUnique({ where: { id }, include: { members: { include: { user: { select: { name: true, email: true, phone: true, lastLoginAt: true } } } }, agreements: { orderBy: { createdAt: "desc" } }, documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } }, verifications: { orderBy: { createdAt: "desc" } }, _count: { select: { properties: true, leads: true, deals: true } } } });
  if (!p) notFound();
  const [settings, flags] = await Promise.all([getAllSettings(), db.riskFlag.findMany({ where: { subjectType: "PARTNER", subjectId: id, status: { in: ["OPEN", "INVESTIGATING"] } } })]);
  const returnTo = `/admin/partners/${id}`;
  const can = (perm: Parameters<typeof hasPermission>[1]) => hasPermission(user.role, perm);
  return (
    <>
      <PageTitle title={p.companyName} description={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={p.status} /> {humanize(p.type)} · {p._count.properties} listings · {p._count.leads} leads · {p._count.deals} deals</span>} action={p.status === "APPROVED" && <Link href={`/partners/${p.slug}`} className="text-sm underline">Public profile</Link>} />
      {flags.map((f) => <Notice key={f.id} tone="danger" className="mb-4" title={`Risk flag: ${humanize(f.reason)}`}>{f.details}</Notice>)}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Panel title="Application details">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[["Registration no.", p.registrationNumber], ["Licence info", p.licenseInfo], ["Email", p.email], ["Phone", formatNigerianPhone(p.phone)], ["Office", p.officeAddress], ["City / State", `${p.city}, ${p.state}`], ["Website", p.website], ["Areas served", p.areasServed.join(", ")], ["Categories", p.propertyCategories.join(", ")], ["Applied", p.createdAt.toLocaleDateString("en-NG")]].map(([k, v]) => <div key={k as string}><dt className="text-stone-500">{k}</dt><dd>{v || "—"}</dd></div>)}
            </dl>
            {p.statusReason && <p className="mt-4 text-sm text-stone-600">Last status reason: {p.statusReason}</p>}
            <p className="mt-4 text-xs text-stone-500">Details are as supplied by the applicant and are unverified unless a verification record below says otherwise.</p>
          </Panel>
          {can("partner:review") && <Panel title="Status"><PartnerStatusForm id={p.id} returnTo={returnTo} current={p.status} /></Panel>}
          <Panel title="Users">
            <ul className="space-y-2 text-sm">{p.members.map((m) => <li key={m.id}>{m.user.name} · {m.user.email} · <span className="text-stone-500">{humanize(m.role)}{m.user.lastLoginAt && ` · last login ${m.user.lastLoginAt.toLocaleDateString("en-NG")}`}</span></li>)}</ul>
          </Panel>
          {can("partner:edit") && <Panel title="Internal notes (staff only)"><NotesForm id={p.id} returnTo={returnTo} notes={p.internalNotes ?? ""} /></Panel>}
          {can("risk:review") && <Panel title="Flag for investigation"><FlagForm subjectType="PARTNER" subjectId={p.id} returnTo={returnTo} /></Panel>}
        </div>
        <div className="space-y-6">
          <Panel title="Partnership agreements">
            {p.agreements.length === 0 && <p className="mb-4 text-sm text-stone-500">No agreement yet — deals can&apos;t be closed until commission terms exist.</p>}
            <ul className="mb-6 space-y-3 text-sm">
              {p.agreements.map((a) => (
                <li key={a.id} className="border-b border-stone-100 pb-3">
                  <div className="flex items-center justify-between"><span className="font-mono text-xs">{a.reference}</span><StatusBadge status={a.status} /></div>
                  <p>{a.commissionType === "PERCENTAGE" ? bpsToPercent(a.commissionRateBps ?? 0) : formatNaira(a.fixedFeeKobo ?? 0n)} · {a.attributionWindowDays}-day protection · {a.paymentTermsDays}-day terms</p>
                  <p className="text-xs text-stone-500">From {a.startDate.toLocaleDateString("en-NG")}{a.endDate && ` to ${a.endDate.toLocaleDateString("en-NG")}`} · {humanize(a.scope)}</p>
                  {a.specialConditions && <p className="mt-1 text-xs text-stone-600">{a.specialConditions}</p>}
                  {can("agreement:manage") && (
                    <form action={agreementStatusAction} className="mt-1 flex gap-3 text-xs"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="returnTo" value={returnTo} />
                      {a.status !== "ACTIVE" && <button name="status" value="ACTIVE" className="underline">Activate</button>}
                      {a.status === "ACTIVE" && <button name="status" value="TERMINATED" className="text-danger underline">Terminate</button>}
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {can("agreement:manage") && <AgreementForm partnerId={p.id} returnTo={returnTo} windowOptions={settings["attribution.windowOptions"]} defaultWindow={settings["attribution.defaultWindowDays"]} />}
            <p className="mt-3 text-xs text-stone-500">Upload the signed agreement as a document of type “Partnership agreement”.</p>
          </Panel>
          <Panel title="Documents">
            {p.documents.length === 0 ? <p className="text-sm text-stone-500">No documents uploaded.</p> : (
              <ul className="space-y-3 text-sm">{p.documents.map((d) => (
                <li key={d.id} className="border-b border-stone-100 pb-3">
                  <div className="flex items-center justify-between gap-2"><a href={`/api/documents/${d.id}`} className="underline">{d.title}</a><StatusBadge status={d.status} /></div>
                  <p className="text-xs text-stone-500">{humanize(d.type)} · {d.createdAt.toLocaleDateString("en-NG")}{d.expiresAt && ` · expires ${d.expiresAt.toLocaleDateString("en-NG")}`}</p>
                  {can("document:review") && d.status !== "APPROVED" && (
                    <form action={reviewDocumentAction} className="mt-1 flex gap-3 text-xs"><input type="hidden" name="id" value={d.id} /><input type="hidden" name="returnTo" value={returnTo} /><button name="status" value="APPROVED" className="underline">Approve</button><button name="status" value="REJECTED" className="text-danger underline">Reject</button></form>
                  )}
                </li>
              ))}</ul>
            )}
          </Panel>
          <Panel title="Verification">
            <ul className="mb-4 space-y-2 text-sm">{p.verifications.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2">{BADGE_COPY[v.category].label} <span className="flex items-center gap-2"><StatusBadge status={v.status} />
                {can("verification:manage") && v.status !== "REVOKED" && <form action={verificationStatusAction}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="returnTo" value={returnTo} /><button name="status" value={v.status === "PENDING" ? "ACTIVE" : "REVOKED"} className="text-xs underline">{v.status === "PENDING" ? "Complete" : "Revoke"}</button></form>}
              </span></li>
            ))}</ul>
            {can("verification:manage") && <VerificationForm subjectType="PARTNER" subjectId={p.id} returnTo={returnTo} />}
          </Panel>
        </div>
      </div>
    </>
  );
}
