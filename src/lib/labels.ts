// Human-readable labels for enums. Kept in one place so UI copy stays consistent.
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const propertyTypeLabels: Record<string, string> = {
  DETACHED_DUPLEX: "Detached Duplex",
  SEMI_DETACHED_DUPLEX: "Semi-Detached Duplex",
  TERRACE: "Terrace",
  APARTMENT: "Apartment",
  PENTHOUSE: "Penthouse",
  VILLA: "Villa",
  MAISONETTE: "Maisonette",
  BUNGALOW: "Bungalow",
  TOWNHOUSE: "Townhouse",
  LAND: "Land",
  COMMERCIAL: "Commercial",
};

export const pricePeriodSuffix: Record<string, string> = {
  TOTAL: "",
  PER_YEAR: "/yr",
  PER_MONTH: "/mo",
};
