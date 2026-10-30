import Link from "next/link";
import type { PartnerStatus } from "@prisma/client";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { EmptyState } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { cn } from "@/lib/cn";
import { humanize } from "@/lib/labels";

const STATUSES: PartnerStatus[] = ["PENDING", "UNDER_REVIEW", "APPROVED", "SUSPENDED", "REJECTED"];

export default async function AdminPartners({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("partner:read");
  const { status } = await searchParams;
  const s = STATUSES.find((x) => x === status);
  const partners = await db.partner.findMany({ where: { deletedAt: null, ...(s ? { status: s } : {}) }, select: { id: true, companyName: true, type: true, status: true, city: true, createdAt: true, isDemo: true, _count: { select: { properties: true, leads: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageTitle title="Partners" />
      <nav className="mb-4 flex flex-wrap gap-1"><Link href="/admin/partners" className={cn("border px-3 py-1.5 text-xs", !s ? "border-ink bg-ink text-ivory" : "border-stone-300 bg-white")}>All</Link>{STATUSES.map((x) => <Link key={x} href={`/admin/partners?status=${x}`} className={cn("border px-3 py-1.5 text-xs", s === x ? "border-ink bg-ink text-ivory" : "border-stone-300 bg-white")}>{humanize(x)}</Link>)}</nav>
      {partners.length === 0 ? <EmptyState title="No partners here" /> : (
        <DataTable head={["Company", "Type", "City", "Listings", "Leads", "Applied", "Status"]}>
          {partners.map((p) => <tr key={p.id} className="hover:bg-stone-50"><Td><Link href={`/admin/partners/${p.id}`} className="font-medium hover:underline">{p.companyName}</Link>{p.isDemo && <span className="ml-1 text-xs text-stone-400">demo</span>}</Td><Td>{humanize(p.type)}</Td><Td>{p.city}</Td><Td>{p._count.properties}</Td><Td>{p._count.leads}</Td><Td>{p.createdAt.toLocaleDateString("en-NG")}</Td><Td><StatusBadge status={p.status} /></Td></tr>)}
        </DataTable>
      )}
    </>
  );
}
