import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { humanize } from "@/lib/labels";

export default async function AdminViewings() {
  await requireStaffPage("lead:read");
  const items = await db.viewing.findMany({ where: { status: { in: ["REQUESTED", "SCHEDULED"] } }, include: { lead: { select: { id: true, code: true, customer: { select: { fullName: true } }, partner: { select: { companyName: true } } } }, property: { select: { title: true } } }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }], take: 200 });
  return (
    <>
      <PageTitle title="Upcoming viewings" description="Requested and scheduled viewings across all partners." />
      {items.length === 0 ? <EmptyState title="No upcoming viewings" /> : (
        <DataTable head={["When", "Client", "Property", "Partner", "Mode", "Status"]}>
          {items.map((v) => <tr key={v.id}><Td>{v.scheduledAt?.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) ?? <span className="text-brass-600">Needs scheduling</span>}</Td><Td><Link href={`/admin/leads/${v.lead.id}`} className="underline">{v.lead.customer.fullName}</Link><p className="font-mono text-xs text-stone-500">{v.lead.code}</p></Td><Td>{v.property.title}</Td><Td>{v.lead.partner?.companyName}</Td><Td>{humanize(v.mode)}</Td><Td><StatusBadge status={v.status} /></Td></tr>)}
        </DataTable>
      )}
    </>
  );
}
