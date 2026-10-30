import { NotificationsList } from "@/components/dashboard/notifications-list";
import { requireUser } from "@/server/auth/guards";

export default async function Page() {
  const user = await requireUser("/account/notifications");
  return <NotificationsList userId={user.id} path="/account/notifications" />;
}
