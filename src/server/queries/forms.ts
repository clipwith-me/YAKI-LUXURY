import type { Property, PropertyAmenity, Amenity, PropertyImage } from "@prisma/client";
import { db } from "@/server/db";
import { koboToNaira } from "@/lib/money";
import type { PropertyFormValues } from "@/components/forms/property-form";

export async function areaOptions() {
  const areas = await db.location.findMany({ where: { type: "AREA", isActive: true }, select: { id: true, name: true, parent: { select: { name: true, sortOrder: true } }, sortOrder: true }, orderBy: [{ parent: { sortOrder: "asc" } }, { sortOrder: "asc" }] });
  return areas.map((a) => ({ id: a.id, label: a.name, group: a.parent?.name ?? "" }));
}

export function toFormValues(p: Property & { amenities: Array<PropertyAmenity & { amenity: Amenity }>; images: PropertyImage[] }): PropertyFormValues {
  return {
    ...p,
    price: String(koboToNaira(p.priceKobo)),
    completionDate: p.completionDate?.toISOString().slice(0, 10) ?? null,
    amenities: p.amenities.map((a) => a.amenity.key),
    imageUrls: p.images.sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.url),
  };
}
