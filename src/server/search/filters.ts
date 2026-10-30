import { z } from "zod";
import { ListingType, PropertyType } from "@prisma/client";

/**
 * The single, typed representation of "what the customer is looking for".
 * Produced by URL params, the structured search form, the natural-language interpreter and
 * stored as the criteria of property alerts — so every entry point shares one query engine.
 */
export const AMENITY_KEYS = [
  "pool",
  "gym",
  "security",
  "parking",
  "generator",
  "power",
  "water",
  "estate",
  "waterfront",
  "smart_home",
  "garden",
  "bq",
  "balcony",
  "elevator",
  "cinema",
] as const;
export type AmenityKey = (typeof AMENITY_KEYS)[number];

export const SORTS = ["newest", "price_asc", "price_desc", "bedrooms_desc"] as const;

const intParam = z.coerce.number().int().min(0).max(1_000_000_000_000);
const flag = z
  .union([z.literal("1"), z.literal("true"), z.boolean()])
  .optional()
  .transform((v) => (v === undefined ? undefined : true));

export const searchFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  listingType: z.nativeEnum(ListingType).optional(),
  // Location path: "lagos" or "lagos/lekki".
  location: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+(\/[a-z0-9-]+)?$/)
    .optional(),
  propertyTypes: z.array(z.nativeEnum(PropertyType)).max(11).optional(),
  minPrice: intParam.optional(), // naira (whole)
  maxPrice: intParam.optional(),
  minBedrooms: z.coerce.number().int().min(0).max(20).optional(),
  minBathrooms: z.coerce.number().int().min(0).max(20).optional(),
  minSize: z.coerce.number().int().min(0).max(1_000_000).optional(),
  furnished: flag,
  serviced: flag,
  offPlan: flag,
  newConstruction: flag,
  luxury: flag,
  verified: flag,
  partner: z.string().trim().max(120).optional(),
  amenities: z.array(z.enum(AMENITY_KEYS)).max(AMENITY_KEYS.length).optional(),
  sort: z.enum(SORTS).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

const ARRAY_KEYS = new Set(["propertyTypes", "amenities"]);

/** Parses URLSearchParams-like input. Invalid params are dropped rather than failing the page. */
export function parseSearchParams(input: Record<string, string | string[] | undefined>): SearchFilters {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === "") continue;
    if (ARRAY_KEYS.has(key)) {
      raw[key] = (Array.isArray(value) ? value : value.split(",")).filter(Boolean);
    } else {
      raw[key] = Array.isArray(value) ? value[0] : value;
    }
  }
  const result = searchFiltersSchema.safeParse(raw);
  if (result.success) return result.data;
  // Retry field-by-field so one bad param doesn't wipe the rest.
  const clean: Record<string, unknown> = {};
  const shape = searchFiltersSchema.shape;
  for (const [key, value] of Object.entries(raw)) {
    const fieldSchema = shape[key as keyof typeof shape];
    if (!fieldSchema) continue;
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success && parsed.data !== undefined) clean[key] = parsed.data;
  }
  return searchFiltersSchema.parse(clean);
}

export function filtersToSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else if (value === true) {
      params.set(key, "1");
    } else {
      params.set(key, String(value));
    }
  }
  return params;
}
