import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td } from "@/components/dashboard/table";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";

export default async function AuditLog({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  await requireStaffPage("audit:read");
  const entity = (await searchParams).entity?.slice(0, 60);
  const logs = await db.auditLog.findMany({ where: entity ? { OR: [{ entityId: entity }, { entityType: entity }] } : {}, include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  const show = (v: unknown) => (v === null || v === undefined ? "" : JSON.stringify(v).slice(0, 300));
  return (
    <>
      <PageTitle title="Audit log" description="Append-only record of administrative and business-critical actions." />
      <form className="mb-4"><input name="entity" defaultValue={entity} placeholder="Entity id or type (e.g. Commission)" aria-label="Filter by entity" className="h-9 w-80 border border-stone-300 bg-white px-3 text-sm" /></form>
      <DataTable head={["When", "Who", "Action", "Entity", "Before → After"]}>
        {logs.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap text-xs text-stone-500">{l.createdAt.toLocaleString("en-NG", { dateStyle: "short", timeStyle: "medium" })}</Td>
            <Td>{l.actor?.name ?? "System"}</Td><Td className="font-mono text-xs">{l.action}</Td><Td className="text-xs">{l.entityType}<p className="font-mono text-stone-400">{l.entityId.slice(0, 12)}</p></Td>
            <Td className="max-w-md break-all font-mono text-[11px] text-stone-600">{show(l.before)}{l.before && l.after ? " → " : ""}{show(l.after)}</Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
