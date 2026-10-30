import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { EmptyState, ButtonLink } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { deleteAlertAction } from "@/app/actions/account";
import { filtersToSearchParams, searchFiltersSchema } from "@/server/search/filters";
import { humanize } from "@/lib/labels";

export default async function AlertsPage() {
  const user = await requireUser("/account/alerts");
  const alerts = await db.propertyAlert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageTitle title="Property alerts" description="We'll notify you when new listings match." action={<ButtonLink href="/properties" variant="outline">New search</ButtonLink>} />
      {alerts.length === 0 ? (
        <EmptyState icon={<Icon.Bell />} title="No alerts yet" description="Run a search, then choose “Create an alert for this search”." action={<ButtonLink href="/properties">Search properties</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => {
            const parsed = searchFiltersSchema.safeParse(a.criteria);
            const qs = parsed.success ? filtersToSearchParams(parsed.data).toString() : "";
            const summary = parsed.success ? Object.entries(parsed.data).map(([k, v]) => `${humanize(k.replace(/([A-Z])/g, "_$1"))}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ") : "";
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 border border-stone-200 bg-white p-5">
                <div className="min-w-0"><p className="font-medium">{a.name}</p><p className="mt-1 truncate text-xs text-stone-500">{summary || "All properties"} · {humanize(a.frequency)}</p></div>
                <div className="flex items-center gap-4 text-sm">
                  <Link href={`/properties?${qs}`} className="underline">View matches</Link>
                  <form action={deleteAlertAction}><input type="hidden" name="id" value={a.id} /><button className="text-danger hover:underline">Delete</button></form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
