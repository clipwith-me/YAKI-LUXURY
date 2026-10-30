import { notFound } from "next/navigation";
import { PageTitle } from "@/components/dashboard/shell";
import { ArticleForm } from "@/components/admin/article-form";
import { Notice } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { CATEGORY_LABELS } from "@/server/services/articles";

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireStaffPage("content:manage");
  const a = await db.article.findUnique({ where: { id: (await params).id } });
  if (!a) notFound();
  return (
    <>
      <PageTitle title={a.title} action={a.status === "PUBLISHED" && <a href={`/journal/${a.slug}`} className="text-sm underline">View</a>} />
      {(await searchParams).saved && <Notice tone="trust" className="mb-4">Saved.</Notice>}
      <ArticleForm v={a} categories={Object.entries(CATEGORY_LABELS)} />
    </>
  );
}
