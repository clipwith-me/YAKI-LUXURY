import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState, ButtonLink } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { priceLabel } from "@/lib/property-format";

export default async function PartnerProperties() {
  const user = await requirePartnerPage();
  const items = await db.property.findMany({ where: { partnerId: user.partnerId, deletedAt: null }, select: { id: true, title: true, reference: true, status: true, availability: true, priceKobo: true, pricePeriod: true, priceOnRequest: true, updatedAt: true, _count: { select: { leads: true } } }, orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageTitle title="Properties" action={<ButtonLink href="/partner/properties/new">Add property</ButtonLink>} />
      {items.length === 0 ? <EmptyState title="No properties yet" description="Add your first listing — our team reviews it before it goes live." action={<ButtonLink href="/partner/properties/new">Add property</ButtonLink>} /> : (
        <DataTable head={["Property", "Status", "Availability", "Price", "Leads", "Updated"]}>
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-stone-50">
              <Td><Link href={`/partner/properties/${p.id}`} className="font-medium hover:underline">{p.title}</Link><p className="font-mono text-xs text-stone-500">{p.reference}</p></Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="capitalize">{p.availability.replace("_", " ").toLowerCase()}</Td>
              <Td>{priceLabel(p, true)}</Td>
              <Td>{p._count.leads}</Td>
              <Td className="text-stone-500">{p.updatedAt.toLocaleDateString("en-NG")}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
