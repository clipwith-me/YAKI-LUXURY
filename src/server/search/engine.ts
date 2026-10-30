import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { publicPropertyWhere, propertyCardSelect, type PropertyCardData } from "@/server/services/properties";
import { activeBadgeWhere } from "@/server/services/verification";
import type { SearchFilters } from "./filters";

export const PAGE_SIZE = 12;

/** Translates SearchFilters into one indexed Prisma query. Shared by search pages, alerts and the NL search. */
export function buildWhere(f: SearchFilters): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [publicPropertyWhere()];
  if (f.listingType) and.push({ listingType: f.listingType });
  if (f.location) and.push({ OR: [{ location: { path: f.location } }, { location: { parent: { path: f.location } } }] });
  if (f.propertyTypes?.length) and.push({ propertyType: { in: f.propertyTypes } });
  if (f.minPrice !== undefined) and.push({ priceKobo: { gte: BigInt(f.minPrice) * 100n } });
  if (f.maxPrice !== undefined) and.push({ priceKobo: { lte: BigInt(f.maxPrice) * 100n } });
  if (f.minBedrooms) and.push({ bedrooms: { gte: f.minBedrooms } });
  if (f.minBathrooms) and.push({ bathrooms: { gte: f.minBathrooms } });
  if (f.minSize) and.push({ sizeSqm: { gte: f.minSize } });
  if (f.furnished) and.push({ furnished: true });
  if (f.serviced) and.push({ serviced: true });
  if (f.offPlan) and.push({ offPlan: true });
  if (f.newConstruction) and.push({ newConstruction: true });
  if (f.luxury) and.push({ isLuxury: true });
  if (f.verified) and.push({ verifications: { some: { ...activeBadgeWhere(), category: { in: ["LISTING_VERIFIED", "INSPECTION_COMPLETED", "DOCUMENTATION_REVIEWED"] } } } });
  if (f.partner) and.push({ partner: { slug: f.partner } });
  for (const key of f.amenities ?? []) and.push({ amenities: { some: { amenity: { key } } } });
  if (f.q) {
    // ILIKE is fine to low thousands of listings; move to Postgres FTS (tsvector + GIN) beyond that.
    const q = f.q.slice(0, 100);
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { developmentName: { contains: q, mode: "insensitive" } },
        { location: { name: { contains: q, mode: "insensitive" } } },
        { reference: { equals: q.toUpperCase() } },
      ],
    });
  }
  return { AND: and };
}

function orderBy(sort: SearchFilters["sort"]): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ priceKobo: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ priceKobo: "desc" }, { id: "asc" }];
    case "bedrooms_desc":
      return [{ bedrooms: "desc" }, { publishedAt: "desc" }];
    default:
      return [{ featured: "desc" }, { publishedAt: "desc" }, { id: "asc" }];
  }
}

export type SearchResult = { items: PropertyCardData[]; total: number; page: number; pageCount: number };

export async function searchProperties(filters: SearchFilters, pageSize = PAGE_SIZE): Promise<SearchResult> {
  const where = buildWhere(filters);
  const page = filters.page ?? 1;
  const [total, items] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({ where, select: propertyCardSelect, orderBy: orderBy(filters.sort), skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function locationIndex(): Promise<Array<{ path: string; names: string[] }>> {
  const locations = await db.location.findMany({ where: { isActive: true }, select: { path: true, name: true, slug: true } });
  return locations.map((l) => ({ path: l.path, names: [...new Set([l.name.toLowerCase(), l.slug.replace(/-/g, " ")])] }));
}
