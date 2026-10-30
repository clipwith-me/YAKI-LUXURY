import Link from "next/link";
import { LeadStatus } from "@prisma/client";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { listLeadsForStaff } from "@/server/services/leads";
import { humanize } from "@/lib/labels";

export default async function AdminLeads({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const user = await requireStaffPage("lead:read");
  const sp = await searchParams;
  const status = Object.values(LeadStatus).find((s) => s === sp.status);
  const res = await listLeadsForStaff(toActor(user), { status, q: sp.q?.slice(0, 80), page: Math.max(1, Number(sp.page) || 1) });
  return (
    <>
      <PageTitle title="Leads" description={`${res.total} total`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="status" defaultValue={status ?? ""} aria-label="Filter by status" className="h-9 border border-stone-300 bg-white px-2 text-sm"><option value="">All statuses</option>{Object.values(LeadStatus).map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
        <input name="q" defaultValue={sp.q} placeholder="Lead ID, client or property" aria-label="Search leads" className="h-9 w-64 border border-stone-300 bg-white px-3 text-sm" />
        <button className="h-9 border border-stone-300 bg-white px-3 text-sm">Filter</button>
      </form>
      {res.items.length === 0 ? <EmptyState title="No new leads yet." /> : (
        <DataTable head={["Lead ID", "Client", "Property / partner", "Type", "Assigned", "Status", "Created"]}>
          {res.items.map((l) => (
            <tr key={l.id} className="hover:bg-stone-50">
              <Td><Link href={`/admin/leads/${l.id}`} className="font-mono text-xs font-medium hover:underline">{l.code}</Link></Td>
              <Td>{l.customer.fullName}</Td>
              <Td>{l.property ? <>{l.property.title}<p className="text-xs text-stone-500">{l.partner?.companyName}</p></> : <span className="text-stone-500">General enquiry</span>}</Td>
              <Td>{humanize(l.type)}</Td><Td>{l.assignedTo?.name ?? <span className="text-stone-400">Unassigned</span>}</Td><Td><StatusBadge status={l.status} /></Td>
              <Td className="text-stone-500">{l.createdAt.toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}</Td>
            </tr>
          ))}
        </DataTable>
      )}
      {res.pageCount > 1 && <div className="mt-4 flex gap-3 text-sm">{res.page > 1 && <Link href={`?${new URLSearchParams({ ...(status ? { status } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(res.page - 1) })}`} className="underline">Previous</Link>}<span>Page {res.page} of {res.pageCount}</span>{res.page < res.pageCount && <Link href={`?${new URLSearchParams({ ...(status ? { status } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(res.page + 1) })}`} className="underline">Next</Link>}</div>}
    </>
  );
}
