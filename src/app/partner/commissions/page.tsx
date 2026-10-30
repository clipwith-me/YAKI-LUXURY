import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState, Notice } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { listCommissionsForPartner } from "@/server/services/commissions";
import { db } from "@/server/db";
import { formatNaira, bpsToPercent } from "@/lib/money";

export default async function PartnerCommissions() {
  const user = await requirePartnerPage();
  const [items, agreement] = await Promise.all([listCommissionsForPartner(toActor(user), user.partnerId), db.partnerAgreement.findFirst({ where: { partnerId: user.partnerId, status: "ACTIVE" } })]);
  return (
    <>
      <PageTitle title="Commission" description="Referral commission owed to YAKI'S LUXE HOMES under your partnership agreement." />
      {agreement ? (
        <Notice tone="neutral" className="mb-6" title={`Agreement ${agreement.reference}`}>
          {agreement.commissionType === "PERCENTAGE" ? `${bpsToPercent(agreement.commissionRateBps ?? 0)} of the final transaction price` : `Fixed fee of ${formatNaira(agreement.fixedFeeKobo ?? 0n)}`} · {agreement.attributionWindowDays}-day referral protection · payment within {agreement.paymentTermsDays} days of completion.
        </Notice>
      ) : <Notice tone="warning" className="mb-6">No active agreement on file yet. Our partner team will share terms with you.</Notice>}
      {items.length === 0 ? <EmptyState title="No commission records yet" description="Commission is calculated automatically when a referred deal closes." /> : (
        <DataTable head={["Lead", "Property", "Basis", "Commission", "Paid", "Due", "Invoice", "Status"]}>
          {items.map((c) => (
            <tr key={c.id}>
              <Td><Link href={`/partner/leads/${c.lead.id}`} className="font-mono text-xs underline">{c.lead.code}</Link></Td>
              <Td>{c.property.title}</Td>
              <Td>{formatNaira(c.basisAmountKobo)}{c.rateBps && <span className="block text-xs text-stone-500">@ {bpsToPercent(c.rateBps)}</span>}</Td>
              <Td className="font-medium">{formatNaira(c.actualKobo ?? c.expectedKobo)}</Td>
              <Td>{formatNaira(c.paidKobo)}</Td>
              <Td>{c.dueDate.toLocaleDateString("en-NG")}</Td>
              <Td className="font-mono text-xs">{c.invoiceNumber ?? "—"}</Td>
              <Td><StatusBadge status={c.status} /></Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
