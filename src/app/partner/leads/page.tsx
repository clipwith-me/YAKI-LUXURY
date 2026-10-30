import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { listLeadsForPartner } from "@/server/services/leads";
import { humanize } from "@/lib/labels";

export default async function PartnerLeads() {
  const user = await requirePartnerPage();
  const leads = await listLeadsForPartner(toActor(user), user.partnerId);
  return (
    <>
      <PageTitle title="Leads" description="Client details appear once YAKI introduces the client to you." />
      {leads.length === 0 ? <EmptyState title="No new leads yet." description="Enquiries on your listings will appear here with a YAKI lead reference." /> : (
        <DataTable head={["Lead", "Property", "Client", "Type", "Status", "Received"]}>
          {leads.map((l) => (
            <tr key={l.id} className="hover:bg-stone-50">
              <Td><Link href={`/partner/leads/${l.id}`} className="font-mono text-xs font-medium hover:underline">{l.code}</Link></Td>
              <Td>{l.property?.title}</Td>
              <Td>{l.customer.fullName}{!l.introducedToPartnerAt && <span className="ml-1 text-xs text-stone-400">(pending intro)</span>}</Td>
              <Td>{humanize(l.type)}</Td>
              <Td><StatusBadge status={l.status} /></Td>
              <Td className="text-stone-500">{l.createdAt.toLocaleDateString("en-NG")}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
