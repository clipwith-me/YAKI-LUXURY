import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/dashboard/table";
import { PropertyForm } from "@/components/forms/property-form";
import { PropertyReviewForm, ListingControlsForm, VerificationForm, FlagForm } from "@/components/admin/forms";
import { verificationStatusAction } from "@/app/actions/admin";
import { Notice } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { hasPermission } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { areaOptions, toFormValues } from "@/server/queries/forms";
import { BADGE_COPY } from "@/server/services/verification";
import { priceLabel } from "@/lib/property-format";
import { koboToNaira } from "@/lib/money";
import { humanize } from "@/lib/labels";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-stone-200 bg-white p-5"><h2 className="mb-4 font-display text-xl">{title}</h2>{children}</section>;
}

export default async function AdminProperty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireStaffPage("property:review");
  const { id } = await params;
  const p = await db.property.findUnique({ where: { id }, include: { partner: true, location: true, amenities: { include: { amenity: true } }, images: true, verifications: { orderBy: { createdAt: "desc" }, include: { verifiedBy: { select: { name: true } } } }, documents: { where: { deletedAt: null } } } });
  if (!p) notFound();
  const flags = await db.riskFlag.findMany({ where: { subjectType: "PROPERTY", subjectId: id, status: { in: ["OPEN", "INVESTIGATING"] } } });
  const returnTo = `/admin/properties/${id}`;
  const { saved } = await searchParams;
  return (
    <>
      <PageTitle title={p.title} description={<span className="flex flex-wrap items-center gap-2"><span className="font-mono">{p.reference}</span><StatusBadge status={p.status} /> {p.partner.companyName} · {p.location.name} · {priceLabel(p)}</span>} action={p.status === "PUBLISHED" && <Link href={`/properties/${p.location.path}/${p.slug}`} className="text-sm underline">View live</Link>} />
      {saved && <Notice tone="trust" className="mb-4">Saved.</Notice>}
      {flags.map((f) => <Notice key={f.id} tone="danger" className="mb-4" title={`Risk flag: ${humanize(f.reason)}`}>{f.details} — <Link href="/admin/risk" className="underline">review queue</Link></Notice>)}
      {p.partner.status !== "APPROVED" && <Notice tone="warning" className="mb-4">Partner status is {p.partner.status.toLowerCase()} — approve the partner before publishing.</Notice>}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {p.status === "PENDING_REVIEW" && <Panel title="Review decision"><PropertyReviewForm id={p.id} returnTo={returnTo} /></Panel>}
          <Panel title="Partner documentation statement (private)"><p className="whitespace-pre-line text-sm text-stone-700">{p.documentationInfo ?? "None provided."}</p>
            {p.documents.length > 0 && <ul className="mt-3 space-y-1 text-sm">{p.documents.map((d) => <li key={d.id}><a href={`/api/documents/${d.id}`} className="underline">{d.title}</a> · <StatusBadge status={d.status} /></li>)}</ul>}
            <p className="mt-3 text-xs text-stone-500">Address (private): {p.addressLine}</p>
          </Panel>
          <details className="border border-stone-200 bg-white p-5"><summary className="cursor-pointer font-display text-xl">Edit listing content</summary><div className="mt-6"><PropertyForm values={toFormValues(p)} locations={await areaOptions()} canSubmit={false} /></div></details>
        </div>
        <div className="space-y-6">
          <Panel title="Listing controls (staff only)">
            {hasPermission(user.role, "property:feature") ? <ListingControlsForm id={p.id} returnTo={returnTo} canCommission={hasPermission(user.role, "commission:manage")} v={{ featured: p.featured, isLuxury: p.isLuxury, showExactAddress: p.showExactAddress, availability: p.availability, commissionType: p.commissionType, commissionRatePercent: p.commissionRateBps ? String(p.commissionRateBps / 100) : "", fixedFeeNaira: p.fixedFeeKobo ? String(koboToNaira(p.fixedFeeKobo)) : "", listingExpiresAt: p.listingExpiresAt?.toISOString().slice(0, 10) ?? "" }} /> : <p className="text-sm text-stone-500">No permission.</p>}
          </Panel>
          <Panel title="Verification">
            <ul className="mb-4 space-y-3 text-sm">
              {p.verifications.length === 0 && <li className="text-stone-500">No verification records — the listing shows “Not verified”.</li>}
              {p.verifications.map((v) => (
                <li key={v.id} className="border-b border-stone-100 pb-3">
                  <div className="flex items-center justify-between gap-2"><span>{BADGE_COPY[v.category].label}</span><StatusBadge status={v.status} /></div>
                  <p className="text-xs text-stone-500">{v.verifiedBy?.name ?? "—"} · {v.verifiedAt?.toLocaleDateString("en-NG") ?? "not completed"}{v.reviewDueAt && ` · review ${v.reviewDueAt.toLocaleDateString("en-NG")}`}</p>
                  {v.internalNotes && <p className="mt-1 text-xs text-stone-600">{v.internalNotes}</p>}
                  {hasPermission(user.role, "verification:manage") && v.status !== "REVOKED" && (
                    <form action={verificationStatusAction} className="mt-1 flex gap-3 text-xs"><input type="hidden" name="id" value={v.id} /><input type="hidden" name="returnTo" value={returnTo} />
                      {v.status === "PENDING" && <button name="status" value="ACTIVE" className="underline">Mark completed</button>}
                      <button name="status" value="REVOKED" className="text-danger underline">Revoke</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {hasPermission(user.role, "verification:manage") && <VerificationForm subjectType="PROPERTY" subjectId={p.id} returnTo={returnTo} />}
          </Panel>
          {hasPermission(user.role, "risk:review") && <Panel title="Flag for investigation"><FlagForm subjectType="PROPERTY" subjectId={p.id} returnTo={returnTo} /></Panel>}
        </div>
      </div>
    </>
  );
}
