import type { NotificationChannel } from "@prisma/client";
import { db, type DbClient } from "@/server/db";
import { STAFF_ROLES, ROLE_PERMISSIONS, type Permission } from "@/server/authz/permissions";
import { driverFor } from "./channels";

export type NotificationType =
  | "lead.new"
  | "lead.assigned"
  | "lead.introduced"
  | "viewing.requested"
  | "viewing.scheduled"
  | "viewing.reminder"
  | "partner.approved"
  | "partner.status_changed"
  | "property.approved"
  | "property.rejected"
  | "property.changes_requested"
  | "property.submitted"
  | "partner.applied"
  | "offer.recorded"
  | "deal.closed"
  | "commission.created"
  | "commission.due"
  | "commission.paid"
  | "document.expiring"
  | "listing.stale"
  | "lead.follow_up"
  | "alert.match";

type Payload = { type: NotificationType; title: string; body: string; link?: string };

/**
 * Writes in-app notifications and queues external deliveries in the same transaction as the
 * business change (outbox pattern). Sending happens in `dispatchQueuedDeliveries`, so a slow SMS
 * provider never slows down or breaks lead capture.
 */
export async function notifyUsers(
  client: DbClient,
  userIds: string[],
  payload: Payload,
  channels: NotificationChannel[] = ["IN_APP", "EMAIL"],
): Promise<void> {
  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    await client.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link,
        deliveries: {
          create: channels.filter((c) => c !== "IN_APP").map((channel) => ({ channel })),
        },
      },
    });
  }
}

export async function staffWithPermission(client: DbClient, permission: Permission): Promise<string[]> {
  const roles = STAFF_ROLES.filter((r) => ROLE_PERMISSIONS[r].has(permission));
  const users = await client.user.findMany({ where: { role: { in: [...roles] }, status: "ACTIVE", deletedAt: null }, select: { id: true } });
  return users.map((u) => u.id);
}

export async function partnerUserIds(client: DbClient, partnerId: string): Promise<string[]> {
  const members = await client.partnerUser.findMany({
    where: { partnerId, user: { status: "ACTIVE", deletedAt: null } },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

/** Worker: sends queued external deliveries. Safe to run repeatedly (cron / queue consumer). */
export async function dispatchQueuedDeliveries(limit = 100): Promise<{ sent: number; skipped: number; failed: number }> {
  const queued = await db.notificationDelivery.findMany({
    where: { status: "QUEUED", attempts: { lt: 5 } },
    take: limit,
    orderBy: { createdAt: "asc" },
    include: { notification: { include: { user: { select: { id: true, email: true, phone: true } } } } },
  });
  const tally = { sent: 0, skipped: 0, failed: 0 };
  for (const d of queued) {
    if (d.channel === "IN_APP") continue;
    const driver = driverFor(d.channel);
    try {
      const res = await driver.send({
        to: { userId: d.notification.user.id, email: d.notification.user.email, phone: d.notification.user.phone },
        title: d.notification.title,
        body: d.notification.body,
        link: d.notification.link,
      });
      await db.notificationDelivery.update({
        where: { id: d.id },
        data: { status: res.status, provider: driver.name, error: res.detail ?? null, attempts: { increment: 1 }, attemptedAt: new Date() },
      });
      res.status === "SENT" ? tally.sent++ : tally.skipped++;
    } catch (err) {
      await db.notificationDelivery.update({
        where: { id: d.id },
        data: {
          status: d.attempts + 1 >= 5 ? "FAILED" : "QUEUED",
          error: err instanceof Error ? err.message.slice(0, 300) : "unknown",
          attempts: { increment: 1 },
          attemptedAt: new Date(),
        },
      });
      tally.failed++;
    }
  }
  return tally;
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  await db.notification.updateMany({
    where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}
