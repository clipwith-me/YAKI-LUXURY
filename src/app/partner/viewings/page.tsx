import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { humanize } from "@/lib/labels";

export default async function PartnerViewings() {
  const user = await requirePartnerPage();
  const items = await db.viewing.findMany({ where: { lead: { partnerId: user.partnerId } }, include: { lead: { select: { id: true, code: true } }, property: { select: { title: true } } }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <>
      <PageTitle title="Viewings" />
      {items.length === 0 ? <EmptyState title="No viewings yet" description="Viewing requests on your listings appear here." /> : (
        <DataTable head={["When", "Property", "Lead", "Mode", "Status"]}>
          {items.map((v) => (
            <tr key={v.id}>
              <Td>{v.scheduledAt ? v.scheduledAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : <span className="text-stone-400">To be scheduled</span>}</Td>
              <Td>{v.property.title}</Td>
              <Td><Link href={`/partner/leads/${v.lead.id}`} className="font-mono text-xs underline">{v.lead.code}</Link></Td>
              <Td>{humanize(v.mode)}</Td>
              <Td><StatusBadge status={v.status} /></Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
