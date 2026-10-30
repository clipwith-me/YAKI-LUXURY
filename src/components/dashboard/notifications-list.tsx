import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { db } from "@/server/db";
import { markAllReadAction } from "@/app/actions/account";
import { PageTitle } from "./shell";

export async function NotificationsList({ userId, path }: { userId: string; path: string }) {
  const items = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageTitle title="Notifications" description={unread ? `${unread} unread` : "You're all caught up."} action={unread > 0 && <form action={markAllReadAction}><input type="hidden" name="path" value={path} /><button className="text-sm underline">Mark all as read</button></form>} />
      {items.length === 0 ? (
        <EmptyState icon={<Icon.Bell />} title="No notifications yet" description="Updates about leads, viewings and listings will appear here." />
      ) : (
        <ul className="divide-y divide-stone-100 border border-stone-200 bg-white">
          {items.map((n) => (
            <li key={n.id} className="flex gap-4 px-5 py-4">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brass-500"}`} aria-label={n.readAt ? undefined : "Unread"} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}</p>
                <p className="mt-0.5 text-sm text-stone-600">{n.body}</p>
              </div>
              <time className="shrink-0 text-xs text-stone-400" dateTime={n.createdAt.toISOString()}>{n.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
