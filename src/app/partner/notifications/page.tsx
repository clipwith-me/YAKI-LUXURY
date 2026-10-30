import { NotificationsList } from "@/components/dashboard/notifications-list";
import { requirePartnerPage } from "@/server/auth/guards";

export default async function Page() {
  const user = await requirePartnerPage();
  return <NotificationsList userId={user.id} path="/partner/notifications" />;
}
