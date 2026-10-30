import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td, StatusBadge } from "@/components/dashboard/table";
import { StaffForm } from "@/components/admin/forms";
import { userStatusAction } from "@/app/actions/admin";
import { requireStaffPage } from "@/server/auth/guards";
import { STAFF_ROLES } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { humanize } from "@/lib/labels";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireStaffPage("user:manage");
  const q = (await searchParams).q?.slice(0, 80);
  const users = await db.user.findMany({ where: { deletedAt: null, ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}) }, select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true }, orderBy: [{ role: "asc" }, { createdAt: "desc" }], take: 200 });
  const roles = STAFF_ROLES.filter((r) => r !== "SUPER_ADMIN" || me.role === "SUPER_ADMIN");
  return (
    <>
      <PageTitle title="Users & roles" description="Suspension ends all active sessions immediately. Accounts are suspended or deactivated, never deleted." />
      <div className="mb-8 border border-stone-200 bg-white p-6"><h2 className="mb-4 font-display text-xl">Add staff member</h2><StaffForm roles={roles} returnTo="/admin/users" /></div>
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" className="h-9 w-72 border border-stone-300 bg-white px-3 text-sm" /></form>
      <DataTable head={["User", "Role", "Last login", "Status", ""]}>
        {users.map((u) => (
          <tr key={u.id}>
            <Td>{u.name}<p className="text-xs text-stone-500">{u.email}</p></Td><Td>{humanize(u.role)}</Td><Td className="text-stone-500">{u.lastLoginAt?.toLocaleDateString("en-NG") ?? "—"}</Td><Td><StatusBadge status={u.status} /></Td>
            <Td>{u.id !== me.id && (u.role !== "SUPER_ADMIN" || me.role === "SUPER_ADMIN") && (
              <form action={userStatusAction} className="flex gap-2 text-xs"><input type="hidden" name="id" value={u.id} /><input type="hidden" name="returnTo" value="/admin/users" />
                {u.status !== "ACTIVE" && <button name="status" value="ACTIVE" className="underline">Reactivate</button>}
                {u.status === "ACTIVE" && <button name="status" value="SUSPENDED" className="text-danger underline">Suspend</button>}
                {u.status !== "DEACTIVATED" && <button name="status" value="DEACTIVATED" className="underline">Deactivate</button>}
              </form>
            )}</Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
