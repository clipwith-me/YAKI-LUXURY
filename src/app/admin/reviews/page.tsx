import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState, Notice } from "@/components/ui/primitives";
import { moderateReviewAction } from "@/app/actions/admin";
import { requireStaffPage } from "@/server/auth/guards";
import { getSetting } from "@/server/settings";
import { db } from "@/server/db";
import { humanize } from "@/lib/labels";

export default async function AdminReviews() {
  await requireStaffPage("review:moderate");
  const [reviews, enabled] = await Promise.all([db.review.findMany({ include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 }), getSetting("features.publicReviews")]);
  return (
    <>
      <PageTitle title="Reviews" description="Nothing is published without moderation." />
      {!enabled && <Notice tone="neutral" className="mb-6">Customer reviews are currently switched off in Settings.</Notice>}
      {reviews.length === 0 ? <EmptyState title="No reviews submitted" /> : (
        <DataTable head={["Review", "Subject", "Rating", "Author", "Status", "Moderate"]}>
          {reviews.map((r) => (
            <tr key={r.id}>
              <Td className="max-w-sm"><p className="font-medium">{r.title}</p><p className="text-xs text-stone-600">{r.body}</p></Td><Td>{humanize(r.subjectType)}</Td><Td>{r.rating}/5</Td><Td>{r.author.name}</Td><Td><StatusBadge status={r.status} /></Td>
              <Td><form action={moderateReviewAction} className="flex flex-wrap gap-2 text-xs"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="returnTo" value="/admin/reviews" />{["APPROVED", "REJECTED", "HIDDEN", "FLAGGED", "INVESTIGATING"].map((s) => <button key={s} name="status" value={s} className="underline">{humanize(s)}</button>)}</form></Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
