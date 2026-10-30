import Link from "next/link";
import type { PropertyStatus } from "@prisma/client";
import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { priceLabel } from "@/lib/property-format";
import { cn } from "@/lib/cn";

const TABS: Array<[PropertyStatus | "ALL", string]> = [["PENDING_REVIEW", "Review queue"], ["PUBLISHED", "Live"], ["CHANGES_REQUESTED", "Changes requested"], ["DRAFT", "Drafts"], ["REJECTED", "Rejected"], ["ARCHIVED", "Archived"], ["ALL", "All"]];

export default async function AdminProperties({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaffPage("property:review");
  const sp = await searchParams;
  const status = (TABS.find(([s]) => s === sp.status)?.[0] ?? "PENDING_REVIEW") as PropertyStatus | "ALL";
  const items = await db.property.findMany({
    where: { deletedAt: null, ...(status === "ALL" ? {} : { status }), ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { reference: sp.q.toUpperCase() }] } : {}) },
    select: { id: true, title: true, reference: true, status: true, priceKobo: true, pricePeriod: true, priceOnRequest: true, submittedAt: true, isDemo: true, featured: true, partner: { select: { companyName: true } }, location: { select: { name: true } } },
    orderBy: status === "PENDING_REVIEW" ? { submittedAt: "asc" } : { updatedAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageTitle title="Properties" action={<ButtonLink href="/admin/properties/new" variant="outline">Add on behalf of partner</ButtonLink>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1">{TABS.map(([s, l]) => <Link key={s} href={`/admin/properties?status=${s}`} className={cn("border px-3 py-1.5 text-xs", s === status ? "border-ink bg-ink text-ivory" : "border-stone-300 bg-white")}>{l}</Link>)}</nav>
        <form><input type="hidden" name="status" value={status} /><input name="q" defaultValue={sp.q} placeholder="Search title or ref" aria-label="Search properties" className="h-9 border border-stone-300 bg-white px-3 text-sm" /></form>
      </div>
      {items.length === 0 ? <EmptyState title={status === "PENDING_REVIEW" ? "Nothing waiting for review" : "No properties here"} /> : (
        <DataTable head={["Property", "Partner", "Area", "Price", "Submitted", "Status"]}>
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-stone-50">
              <Td><Link href={`/admin/properties/${p.id}`} className="font-medium hover:underline">{p.title}</Link><p className="font-mono text-xs text-stone-500">{p.reference}{p.isDemo && " · demo"}{p.featured && " · featured"}</p></Td>
              <Td>{p.partner.companyName}</Td><Td>{p.location.name}</Td><Td>{priceLabel(p, true)}</Td>
              <Td className="text-stone-500">{p.submittedAt?.toLocaleDateString("en-NG") ?? "—"}</Td><Td><StatusBadge status={p.status} /></Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
