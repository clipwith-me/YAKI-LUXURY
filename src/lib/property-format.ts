import { formatNaira, formatNairaCompact } from "./money";
import { pricePeriodSuffix, propertyTypeLabels } from "./labels";

export function propertyHref(p: { slug: string; location: { path: string } }): string {
  return `/properties/${p.location.path}/${p.slug}`;
}

export function priceLabel(p: { priceKobo: bigint; pricePeriod: string; priceOnRequest: boolean }, compact = false): string {
  if (p.priceOnRequest) return "Price on request";
  return `${compact ? formatNairaCompact(p.priceKobo) : formatNaira(p.priceKobo)}${pricePeriodSuffix[p.pricePeriod] ?? ""}`;
}

export function typeLabel(t: string): string {
  return propertyTypeLabels[t] ?? t;
}

export function locationLabel(p: { location: { name: string; parent: { name: string } | null } }): string {
  return p.location.parent ? `${p.location.name}, ${p.location.parent.name}` : p.location.name;
}
