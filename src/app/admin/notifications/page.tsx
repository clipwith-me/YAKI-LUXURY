import { NotificationsList } from "@/components/dashboard/notifications-list";
import { requireStaffPage } from "@/server/auth/guards";

export default async function Page() {
  const user = await requireStaffPage();
  return <NotificationsList userId={user.id} path="/admin/notifications" />;
}
