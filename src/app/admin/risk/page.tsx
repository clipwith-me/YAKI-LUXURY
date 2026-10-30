import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { resolveFlagAction } from "@/app/actions/admin";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { RISK_REASONS } from "@/server/services/risk";
import { humanize } from "@/lib/labels";

const LINK: Record<string, (id: string) => string> = { PROPERTY: (id) => `/admin/properties/${id}`, PARTNER: (id) => `/admin/partners/${id}`, LEAD: (id) => `/admin/leads/${id}`, CUSTOMER: (id) => `/admin/leads?q=${id}` };

export default async function RiskQueue({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireStaffPage("risk:review");
  const all = (await searchParams).all === "1";
  const flags = await db.riskFlag.findMany({ where: all ? {} : { status: { in: ["OPEN", "INVESTIGATING"] } }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageTitle title="Risk review queue" description="Signals for human review — never automatic accusations or public labels." action={<Link href={all ? "/admin/risk" : "/admin/risk?all=1"} className="text-sm underline">{all ? "Open only" : "Show all"}</Link>} />
      {flags.length === 0 ? <EmptyState title="Nothing to review" description="Duplicate listings, repeated phone numbers and staff reports appear here." /> : (
        <DataTable head={["Raised", "Subject", "Signal", "Details", "Status", "Action"]}>
          {flags.map((f) => (
            <tr key={f.id}>
              <Td className="text-stone-500">{f.createdAt.toLocaleDateString("en-NG")}<p className="text-xs">{humanize(f.source)}</p></Td>
              <Td>{LINK[f.subjectType] ? <Link href={LINK[f.subjectType]!(f.subjectId)} className="underline">{humanize(f.subjectType)}</Link> : humanize(f.subjectType)}</Td>
              <Td>{RISK_REASONS[f.reason as keyof typeof RISK_REASONS] ?? humanize(f.reason)}</Td>
              <Td className="max-w-xs text-stone-600">{f.details}{f.resolution && <p className="mt-1 text-xs">Resolution: {f.resolution}</p>}</Td>
              <Td><StatusBadge status={f.status} /></Td>
              <Td>{(f.status === "OPEN" || f.status === "INVESTIGATING") && (
                <form action={resolveFlagAction} className="flex flex-col gap-1"><input type="hidden" name="id" value={f.id} /><input type="hidden" name="returnTo" value="/admin/risk" />
                  <input name="resolution" placeholder="Outcome note" aria-label="Outcome note" className="h-8 border border-stone-300 px-2 text-xs" />
                  <div className="flex gap-2 text-xs">{f.status === "OPEN" && <button name="status" value="INVESTIGATING" className="underline">Investigate</button>}<button name="status" value="RESOLVED" className="underline">Resolve</button><button name="status" value="DISMISSED" className="underline">Dismiss</button></div>
                </form>
              )}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
