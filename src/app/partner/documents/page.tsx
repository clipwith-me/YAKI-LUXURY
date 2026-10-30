import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { DocumentUploadForm } from "@/components/forms/document-upload-form";
import { EmptyState } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { humanize } from "@/lib/labels";

export default async function PartnerDocuments() {
  const user = await requirePartnerPage();
  const [docs, properties] = await Promise.all([
    db.document.findMany({ where: { partnerId: user.partnerId, deletedAt: null }, include: { property: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
    db.property.findMany({ where: { partnerId: user.partnerId, deletedAt: null }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  return (
    <>
      <PageTitle title="Documents" description="Private to you and authorised YAKI staff. Never shown publicly." />
      <div className="mb-8 border border-stone-200 bg-white p-6"><DocumentUploadForm properties={properties} /></div>
      {docs.length === 0 ? <EmptyState title="No documents uploaded" description="Upload company registration, licences or property documents for review." /> : (
        <DataTable head={["Document", "Type", "Property", "Uploaded", "Expires", "Status"]}>
          {docs.map((d) => (
            <tr key={d.id} id={d.id}>
              <Td><a href={`/api/documents/${d.id}`} className="font-medium underline">{d.title}</a><p className="text-xs text-stone-500">{d.fileName}</p></Td>
              <Td>{humanize(d.type)}</Td>
              <Td>{d.property?.title ?? "—"}</Td>
              <Td>{d.createdAt.toLocaleDateString("en-NG")}</Td>
              <Td>{d.expiresAt?.toLocaleDateString("en-NG") ?? "—"}</Td>
              <Td><StatusBadge status={d.status} />{d.reviewNotes && <p className="mt-1 text-xs text-stone-500">{d.reviewNotes}</p>}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
