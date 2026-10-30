import Link from "next/link";
import { CommissionStatus } from "@prisma/client";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState, Stat } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";
import { humanize } from "@/lib/labels";

export default async function AdminCommissions({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("commission:read");
  const { status } = await searchParams;
  const s = Object.values(CommissionStatus).find((x) => x === status);
  const [items, agg] = await Promise.all([
    db.commission.findMany({ where: s ? { status: s } : {}, include: { lead: { select: { code: true } }, partner: { select: { companyName: true } }, property: { select: { title: true } } }, orderBy: { dueDate: "asc" }, take: 200 }),
    db.commission.groupBy({ by: ["status"], _sum: { expectedKobo: true, paidKobo: true }, _count: true }),
  ]);
  const sum = (sts: CommissionStatus[]) => agg.filter((a) => sts.includes(a.status)).reduce((t, a) => t + (a._sum.expectedKobo ?? 0n) - (a._sum.paidKobo ?? 0n), 0n);
  const overdue = items.filter((c) => c.dueDate < new Date() && !["PAID", "WAIVED"].includes(c.status)).length;
  return (
    <>
      <PageTitle title="Commissions" description="Referral fees owed by partners. Separate from any customer property payment." />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Pending (not yet due)" value={formatNaira(sum(["PENDING"]))} />
        <Stat label="Outstanding (due / invoiced)" value={formatNaira(sum(["DUE", "INVOICED", "PARTIALLY_PAID"]))} />
        <Stat label="Disputed" value={formatNaira(sum(["DISPUTED"]))} />
        <Stat label="Overdue items" value={overdue} />
      </div>
      <nav className="mb-4 flex flex-wrap gap-1"><Link href="/admin/commissions" className={cn("border px-3 py-1.5 text-xs", !s ? "border-ink bg-ink text-ivory" : "border-stone-300 bg-white")}>All</Link>{Object.values(CommissionStatus).map((x) => <Link key={x} href={`/admin/commissions?status=${x}`} className={cn("border px-3 py-1.5 text-xs", s === x ? "border-ink bg-ink text-ivory" : "border-stone-300 bg-white")}>{humanize(x)}</Link>)}</nav>
      {items.length === 0 ? <EmptyState title="No commissions yet" description="Commissions are created automatically when a deal closes." /> : (
        <DataTable head={["Lead", "Partner", "Property", "Expected", "Paid", "Due", "Status"]}>
          {items.map((c) => <tr key={c.id} className="hover:bg-stone-50"><Td><Link href={`/admin/commissions/${c.id}`} className="font-mono text-xs underline">{c.lead.code}</Link></Td><Td>{c.partner.companyName}</Td><Td>{c.property.title}</Td><Td>{formatNaira(c.actualKobo ?? c.expectedKobo)}</Td><Td>{formatNaira(c.paidKobo)}</Td><Td className={c.dueDate < new Date() && !["PAID", "WAIVED"].includes(c.status) ? "text-danger" : ""}>{c.dueDate.toLocaleDateString("en-NG")}</Td><Td><StatusBadge status={c.status} /></Td></tr>)}
        </DataTable>
      )}
    </>
  );
}
