import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { reviewDocumentAction } from "@/app/actions/admin";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { humanize } from "@/lib/labels";

export default async function AdminDocuments() {
  await requireStaffPage("document:review");
  const docs = await db.document.findMany({ where: { deletedAt: null, status: { in: ["PENDING", "UNDER_REVIEW"] } }, include: { partner: { select: { id: true, companyName: true } }, property: { select: { title: true } } }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageTitle title="Document review" description="Private documents — accessible to authorised staff and the uploading partner only." />
      {docs.length === 0 ? <EmptyState title="No documents awaiting review" /> : (
        <DataTable head={["Document", "Partner", "Property", "Uploaded", "Status", "Decision"]}>
          {docs.map((d) => (
            <tr key={d.id}>
              <Td><a href={`/api/documents/${d.id}`} className="underline">{d.title}</a><p className="text-xs text-stone-500">{humanize(d.type)} · {(d.sizeBytes / 1024).toFixed(0)} KB</p></Td>
              <Td>{d.partner && <Link href={`/admin/partners/${d.partner.id}`} className="underline">{d.partner.companyName}</Link>}</Td>
              <Td>{d.property?.title ?? "—"}</Td><Td>{d.createdAt.toLocaleDateString("en-NG")}</Td><Td><StatusBadge status={d.status} /></Td>
              <Td><form action={reviewDocumentAction} className="flex flex-col gap-1"><input type="hidden" name="id" value={d.id} /><input type="hidden" name="returnTo" value="/admin/documents" /><input name="notes" placeholder="Review note" aria-label="Review note" className="h-8 border border-stone-300 px-2 text-xs" /><div className="flex gap-2 text-xs"><button name="status" value="APPROVED" className="underline">Approve</button><button name="status" value="REJECTED" className="text-danger underline">Reject</button></div></form></Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
