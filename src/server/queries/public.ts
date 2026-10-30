import { cache } from "react";
import { db } from "@/server/db";
import { publicPropertyWhere, propertyCardSelect } from "@/server/services/properties";

/** Cached per request: location options for search UIs. */
export const locationOptions = cache(async () => {
  const areas = await db.location.findMany({
    where: { type: "AREA", isActive: true, parent: { isActive: true } },
    select: { path: true, name: true, parent: { select: { name: true, sortOrder: true } }, sortOrder: true },
    orderBy: [{ parent: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  return areas.map((a) => ({ path: a.path, label: a.name, group: a.parent?.name ?? "" }));
});

export const approvedPartnerOptions = cache(async () => {
  const partners = await db.partner.findMany({ where: { status: "APPROVED", deletedAt: null }, select: { slug: true, companyName: true }, orderBy: { companyName: "asc" } });
  return partners.map((p) => ({ slug: p.slug, name: p.companyName }));
});

export async function propertiesByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.property.findMany({ where: { id: { in: ids.slice(0, 4) }, ...publicPropertyWhere() }, select: { ...propertyCardSelect, sizeSqm: true, plotSizeSqm: true, parkingSpaces: true, furnished: true, serviced: true, amenities: { select: { amenity: { select: { label: true } } } } } });
}
