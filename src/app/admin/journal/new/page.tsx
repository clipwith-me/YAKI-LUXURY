import { PageTitle } from "@/components/dashboard/shell";
import { ArticleForm } from "@/components/admin/article-form";
import { requireStaffPage } from "@/server/auth/guards";
import { CATEGORY_LABELS } from "@/server/services/articles";

export default async function NewArticle() {
  await requireStaffPage("content:manage");
  return (<><PageTitle title="New article" /><ArticleForm v={{}} categories={Object.entries(CATEGORY_LABELS)} /></>);
}
