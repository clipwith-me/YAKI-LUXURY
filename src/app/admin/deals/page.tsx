import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatNaira } from "@/lib/money";

export default async function AdminDeals() {
  await requireStaffPage("lead:read");
  const deals = await db.deal.findMany({ include: { lead: { select: { id: true, code: true } }, property: { select: { title: true } }, partner: { select: { companyName: true } }, customer: { select: { fullName: true } } }, orderBy: { updatedAt: "desc" }, take: 200 });
  return (
    <>
      <PageTitle title="Deals" />
      {deals.length === 0 ? <EmptyState title="No deals yet" description="Deals are opened from a lead once the client and partner agree terms." /> : (
        <DataTable head={["Lead", "Client", "Property", "Partner", "Price", "Window", "Status"]}>
          {deals.map((d) => <tr key={d.id}><Td><Link href={`/admin/leads/${d.lead.id}`} className="font-mono text-xs underline">{d.lead.code}</Link></Td><Td>{d.customer.fullName}</Td><Td>{d.property.title}</Td><Td>{d.partner.companyName}</Td><Td>{formatNaira(d.agreedPriceKobo)}</Td><Td>{d.withinAttributionWindow === null ? "—" : d.withinAttributionWindow ? "Within" : <span className="text-danger">Outside</span>}</Td><Td><StatusBadge status={d.status} /></Td></tr>)}
        </DataTable>
      )}
    </>
  );
}
