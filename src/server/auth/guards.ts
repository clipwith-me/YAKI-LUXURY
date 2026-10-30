import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";
import { isStaff, hasPermission, type Permission } from "@/server/authz/permissions";

/** For pages: redirect to login when signed out. */
export async function requireUser(next = "/"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaffPage(permission?: Permission): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!isStaff(user.role) || (permission && !hasPermission(user.role, permission))) redirect("/forbidden");
  return user;
}

export async function requirePartnerPage(): Promise<SessionUser & { partnerId: string }> {
  const user = await requireUser("/partner");
  const partnerId = user.partnerIds[0];
  if (user.role !== "PARTNER" || !partnerId) redirect("/forbidden");
  return { ...user, partnerId };
}
