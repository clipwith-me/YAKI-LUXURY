import { db } from "@/server/db";
import { dispatchQueuedDeliveries, notifyUsers, partnerUserIds, staffWithPermission } from "@/server/notifications/notify";
import { markOverdueCommissionsDue } from "@/server/services/commissions";
import { processDocumentExpiry } from "@/server/services/documents";
import { expireVerifications } from "@/server/services/verification";
import { sendViewingReminders } from "@/server/services/viewings";
import { buildWhere } from "@/server/search/engine";
import { searchFiltersSchema } from "@/server/search/filters";

const DAY = 24 * 60 * 60 * 1000;

/** Archives listings past their expiry date and nudges partners about stale listings. */
export async function processListingHygiene(now = new Date()) {
  const expired = await db.property.findMany({ where: { status: "PUBLISHED", listingExpiresAt: { lte: now } }, select: { id: true, title: true, partnerId: true } });
  for (const p of expired) {
    await db.property.update({ where: { id: p.id }, data: { status: "ARCHIVED" } });
    await notifyUsers(db, await partnerUserIds(db, p.partnerId), { type: "listing.stale", title: "Listing expired", body: `${p.title} has been archived. Resubmit it if it is still available.`, link: `/partner/properties/${p.id}` });
  }
  // Listings not updated for 60 days: remind once a month.
  const stale = await db.property.findMany({ where: { status: "PUBLISHED", updatedAt: { lte: new Date(now.getTime() - 60 * DAY) } }, select: { id: true, title: true, partnerId: true } });
  let reminded = 0;
  for (const p of stale) {
    const link = `/partner/properties/${p.id}`;
    if (await db.notification.findFirst({ where: { type: "listing.stale", link, createdAt: { gte: new Date(now.getTime() - 30 * DAY) } }, select: { id: true } })) continue;
    await notifyUsers(db, await partnerUserIds(db, p.partnerId), { type: "listing.stale", title: "Is this listing still accurate?", body: `Please confirm price and availability for ${p.title}.`, link });
    reminded++;
  }
  return { archived: expired.length, reminded };
}

/** Reminds assigned staff (or all lead managers) of follow-ups that are due. */
export async function processFollowUps(now = new Date()) {
  const due = await db.lead.findMany({
    where: { nextFollowUpAt: { lte: now }, status: { notIn: ["LOST", "COMMISSION_PAID", "CLOSED"] } },
    select: { id: true, code: true, assignedToId: true },
    take: 200,
  });
  const fallback = due.some((l) => !l.assignedToId) ? await staffWithPermission(db, "lead:manage") : [];
  for (const l of due) {
    await notifyUsers(db, l.assignedToId ? [l.assignedToId] : fallback, { type: "lead.follow_up", title: `Follow up ${l.code}`, body: "A scheduled follow-up is due.", link: `/admin/leads/${l.id}` }, ["IN_APP"]);
    await db.lead.update({ where: { id: l.id }, data: { nextFollowUpAt: null } });
  }
  return due.length;
}

/** Property alerts: notify users of newly published listings matching their saved criteria. */
export async function processPropertyAlerts(now = new Date()) {
  const alerts = await db.propertyAlert.findMany({ where: { isActive: true } });
  let notified = 0;
  for (const alert of alerts) {
    const interval = alert.frequency === "INSTANT" ? 0 : alert.frequency === "DAILY" ? DAY : 7 * DAY;
    const last = alert.lastCheckedAt ?? alert.createdAt;
    if (now.getTime() - last.getTime() < interval) continue;
    const criteria = searchFiltersSchema.safeParse(alert.criteria);
    if (!criteria.success) continue;
    const where = { AND: [buildWhere(criteria.data), { publishedAt: { gt: last, lte: now } }] };
    const matches = await db.property.count({ where });
    if (matches > 0) {
      await notifyUsers(db, [alert.userId], { type: "alert.match", title: `${matches} new ${matches === 1 ? "property matches" : "properties match"} “${alert.name}”`, body: "New listings match your alert.", link: `/account/alerts` });
      notified++;
    }
    await db.propertyAlert.update({ where: { id: alert.id }, data: { lastCheckedAt: now } });
  }
  return notified;
}

/**
 * Entry point for the scheduler (Vercel Cron / Render cron / `npm run jobs:run`). Each job is
 * idempotent, so running more often than needed is harmless.
 */
export async function runScheduledJobs(now = new Date()) {
  return {
    commissionsDue: await markOverdueCommissionsDue(now),
    viewingReminders: await sendViewingReminders(now),
    verificationsExpired: await expireVerifications(now),
    documents: await processDocumentExpiry(now),
    listings: await processListingHygiene(now),
    followUps: await processFollowUps(now),
    alerts: await processPropertyAlerts(now),
    deliveries: await dispatchQueuedDeliveries(),
  };
}
