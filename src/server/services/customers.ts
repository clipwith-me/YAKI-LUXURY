import { z } from "zod";
import { db } from "@/server/db";
import { assertAuthenticated, type Actor } from "@/server/authz/policies";
import { DomainError, notFound } from "@/server/errors";
import { publicPropertyWhere, propertyCardSelect } from "@/server/services/properties";
import { searchFiltersSchema } from "@/server/search/filters";
import { track } from "@/server/services/analytics";

export async function toggleFavorite(actor: Actor, propertyId: string): Promise<boolean> {
  assertAuthenticated(actor);
  const property = await db.property.findFirst({ where: { id: propertyId, ...publicPropertyWhere() }, select: { id: true, partnerId: true } });
  if (!property) throw notFound();
  const key = { userId_propertyId: { userId: actor.id, propertyId } };
  const existing = await db.favorite.findUnique({ where: key });
  if (existing) {
    await db.favorite.delete({ where: key });
    return false;
  }
  await db.favorite.create({ data: { userId: actor.id, propertyId } });
  await track({ type: "FAVORITE", propertyId, partnerId: property.partnerId, userId: actor.id });
  return true;
}

export async function listFavorites(actor: Actor) {
  assertAuthenticated(actor);
  const favs = await db.favorite.findMany({
    where: { userId: actor.id, property: publicPropertyWhere() },
    select: { property: { select: propertyCardSelect } },
    orderBy: { createdAt: "desc" },
  });
  return favs.map((f) => f.property);
}

export async function favoriteIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db.favorite.findMany({ where: { userId }, select: { propertyId: true } });
  return new Set(rows.map((r) => r.propertyId));
}

export async function recentlyViewed(actor: Actor) {
  assertAuthenticated(actor);
  const events = await db.analyticsEvent.findMany({
    where: { userId: actor.id, type: "PROPERTY_VIEW", propertyId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { propertyId: true },
    take: 50,
  });
  const ids = [...new Set(events.map((e) => e.propertyId!))].slice(0, 12);
  const props = await db.property.findMany({ where: { id: { in: ids }, ...publicPropertyWhere() }, select: propertyCardSelect });
  return ids.map((id) => props.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
}

export const alertSchema = z.object({
  name: z.string().trim().min(2, "Name your alert").max(80),
  frequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]).default("DAILY"),
  criteria: searchFiltersSchema.omit({ page: true, sort: true }),
});

export async function createAlert(actor: Actor, input: z.input<typeof alertSchema>) {
  assertAuthenticated(actor);
  const data = alertSchema.parse(input);
  const count = await db.propertyAlert.count({ where: { userId: actor.id, isActive: true } });
  if (count >= 10) throw new DomainError("VALIDATION", "You can have up to 10 active alerts.");
  const alert = await db.propertyAlert.create({ data: { userId: actor.id, name: data.name, frequency: data.frequency, criteria: data.criteria, lastCheckedAt: new Date() } });
  await track({ type: "ALERT_CREATED", userId: actor.id });
  return alert;
}

export async function deleteAlert(actor: Actor, alertId: string) {
  assertAuthenticated(actor);
  // Scoped delete: a user can only remove their own alerts.
  const res = await db.propertyAlert.deleteMany({ where: { id: alertId, userId: actor.id } });
  if (res.count === 0) throw notFound();
}

export async function myLeads(actor: Actor) {
  assertAuthenticated(actor);
  return db.lead.findMany({
    where: { customer: { userId: actor.id } },
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      createdAt: true,
      property: { select: { title: true, slug: true, location: { select: { path: true } } } },
      viewings: { select: { id: true, status: true, scheduledAt: true, mode: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}
