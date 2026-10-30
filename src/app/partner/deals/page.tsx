import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatNaira } from "@/lib/money";

export default async function PartnerDeals() {
  const user = await requirePartnerPage();
  const [offers, deals] = await Promise.all([
    db.offer.findMany({ where: { lead: { partnerId: user.partnerId } }, include: { lead: { select: { id: true, code: true } }, property: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.deal.findMany({ where: { partnerId: user.partnerId }, include: { lead: { select: { id: true, code: true } }, property: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageTitle title="Offers & deals" />
      <h2 className="mb-3 text-2xl">Deals</h2>
      {deals.length === 0 ? <EmptyState title="No deals yet" /> : (
        <DataTable head={["Lead", "Property", "Price", "Status", "Closed"]}>
          {deals.map((d) => <tr key={d.id}><Td><Link href={`/partner/leads/${d.lead.id}`} className="font-mono text-xs underline">{d.lead.code}</Link></Td><Td>{d.property.title}</Td><Td>{formatNaira(d.agreedPriceKobo)}</Td><Td><StatusBadge status={d.status} /></Td><Td>{d.closedAt?.toLocaleDateString("en-NG") ?? "—"}</Td></tr>)}
        </DataTable>
      )}
      <h2 className="mb-3 mt-10 text-2xl">Offers</h2>
      {offers.length === 0 ? <EmptyState title="No offers recorded" /> : (
        <DataTable head={["Lead", "Property", "Amount", "Status", "Date"]}>
          {offers.map((o) => <tr key={o.id}><Td><Link href={`/partner/leads/${o.lead.id}`} className="font-mono text-xs underline">{o.lead.code}</Link></Td><Td>{o.property.title}</Td><Td>{formatNaira(o.amountKobo)}</Td><Td><StatusBadge status={o.status} /></Td><Td>{o.createdAt.toLocaleDateString("en-NG")}</Td></tr>)}
        </DataTable>
      )}
    </>
  );
}
