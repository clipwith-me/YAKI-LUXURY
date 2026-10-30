import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { CommissionForms } from "@/components/admin/forms";
import { Notice } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { hasPermission } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { formatNaira, bpsToPercent } from "@/lib/money";
import { humanize } from "@/lib/labels";

export default async function AdminCommission({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage("commission:read");
  const { id } = await params;
  const c = await db.commission.findUnique({ where: { id }, include: { lead: { select: { id: true, code: true } }, partner: { select: { id: true, companyName: true } }, property: { select: { title: true, reference: true } }, deal: true, agreement: { select: { reference: true } }, payments: { orderBy: { paidAt: "asc" } } } });
  if (!c) notFound();
  const owed = c.actualKobo ?? c.expectedKobo;
  return (
    <>
      <PageTitle title={`Commission — ${c.lead.code}`} description={<span className="flex items-center gap-2"><StatusBadge status={c.status} /> {c.partner.companyName}</span>} />
      {c.notes && <Notice tone="warning" className="mb-6">{c.notes}</Notice>}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="border border-stone-200 bg-white p-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              {[["Property", `${c.property.title} (${c.property.reference})`], ["Lead", <Link key="l" href={`/admin/leads/${c.lead.id}`} className="underline">{c.lead.code}</Link>], ["Partner", <Link key="p" href={`/admin/partners/${c.partner.id}`} className="underline">{c.partner.companyName}</Link>], ["Transaction price", formatNaira(c.basisAmountKobo)], ["Structure", c.commissionType === "PERCENTAGE" ? `${bpsToPercent(c.rateBps ?? 0)} of price` : `Fixed ${formatNaira(c.fixedFeeKobo ?? 0n)}`], ["Agreement", c.agreement?.reference ?? "Property override"], ["Expected", formatNaira(c.expectedKobo)], ["Actual", c.actualKobo !== null ? formatNaira(c.actualKobo) : "Same as expected"], ["Received", `${formatNaira(c.paidKobo)} of ${formatNaira(owed)}`], ["Due date", c.dueDate.toLocaleDateString("en-NG", { dateStyle: "medium" })], ["Invoice", c.invoiceNumber ?? "—"], ["Deal closed", c.deal.closedAt?.toLocaleDateString("en-NG", { dateStyle: "medium" }) ?? "—"]].map(([k, v]) => <div key={k as string}><dt className="text-stone-500">{k}</dt><dd className="mt-0.5">{v}</dd></div>)}
            </dl>
          </section>
          <section>
            <h2 className="mb-3 text-xl">Payments received</h2>
            <DataTable head={["Date", "Amount", "Method", "Reference"]} empty={c.payments.length ? null : <p className="p-6 text-center text-sm text-stone-500">No payments recorded.</p>}>
              {c.payments.map((p) => <tr key={p.id}><Td>{p.paidAt.toLocaleDateString("en-NG")}</Td><Td>{formatNaira(p.amountKobo)}</Td><Td>{humanize(p.method)}</Td><Td className="font-mono text-xs">{p.reference}</Td></tr>)}
            </DataTable>
          </section>
        </div>
        <CommissionForms id={c.id} returnTo={`/admin/commissions/${c.id}`} status={c.status} canManage={hasPermission(user.role, "commission:manage")} />
      </div>
    </>
  );
}
