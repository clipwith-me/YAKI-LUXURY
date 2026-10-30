import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { CATEGORY_LABELS } from "@/server/services/articles";

export default async function AdminJournal() {
  await requireStaffPage("content:manage");
  const articles = await db.article.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageTitle title="Journal" action={<ButtonLink href="/admin/journal/new">New article</ButtonLink>} />
      {articles.length === 0 ? <EmptyState title="No articles yet" /> : (
        <DataTable head={["Title", "Category", "Status", "Published"]}>
          {articles.map((a) => <tr key={a.id}><Td><Link href={`/admin/journal/${a.id}`} className="font-medium underline">{a.title}</Link>{a.isDemo && <span className="ml-1 text-xs text-stone-400">sample</span>}</Td><Td>{CATEGORY_LABELS[a.category]}</Td><Td><StatusBadge status={a.status} /></Td><Td>{a.publishedAt?.toLocaleDateString("en-NG") ?? "—"}</Td></tr>)}
        </DataTable>
      )}
    </>
  );
}
