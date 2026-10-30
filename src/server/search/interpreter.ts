import type { PropertyType } from "@prisma/client";
import type { AmenityKey, SearchFilters } from "./filters";

/**
 * Natural-language → SearchFilters.
 *
 * `QueryInterpreter` is the seam for AI search: an LLM-backed implementation can be added later
 * (returning the same SearchFilters, validated by the same zod schema) without touching the search
 * engine, URLs, alerts or UI. The rule-based interpreter below ships today: deterministic, free,
 * instant, and good enough for the common phrasing Nigerian buyers actually use.
 */
export interface QueryInterpreter {
  interpret(text: string, ctx: InterpreterContext): Promise<InterpretedQuery>;
}

export type InterpreterContext = {
  /** Known location paths with names/aliases, e.g. { path: "lagos/lekki", names: ["lekki"] }. */
  locations: Array<{ path: string; names: string[] }>;
};

export type InterpretedQuery = {
  filters: SearchFilters;
  /** Human-readable chips of what we understood — shown so users can correct us. */
  understood: string[];
};

const TYPE_PATTERNS: Array<[RegExp, PropertyType, string]> = [
  [/\bsemi[\s-]?detached\b/, "SEMI_DETACHED_DUPLEX", "Semi-detached duplex"],
  [/\b(fully[\s-]?)?detached\b/, "DETACHED_DUPLEX", "Detached duplex"],
  [/\bduplex(es)?\b/, "DETACHED_DUPLEX", "Duplex"],
  [/\bpent[\s-]?house\b/, "PENTHOUSE", "Penthouse"],
  [/\bterrace[ds]?\b/, "TERRACE", "Terrace"],
  [/\bmaisonette\b/, "MAISONETTE", "Maisonette"],
  [/\bbungalow\b/, "BUNGALOW", "Bungalow"],
  [/\btown[\s-]?house\b/, "TOWNHOUSE", "Townhouse"],
  [/\bvilla\b/, "VILLA", "Villa"],
  [/\b(apartment|flat|condo)s?\b/, "APARTMENT", "Apartment"],
  [/\b(land|plot)s?\b/, "LAND", "Land"],
  [/\b(office|commercial|shop)\b/, "COMMERCIAL", "Commercial"],
];

const AMENITY_PATTERNS: Array<[RegExp, AmenityKey, string]> = [
  [/\b(swimming\s+)?pool\b/, "pool", "Pool"],
  [/\bgym|fitness\b/, "gym", "Gym"],
  [/\b(24\/7\s+)?security|gated\b/, "security", "Security"],
  [/\bparking|garage\b/, "parking", "Parking"],
  [/\bgenerator|\bgen\b/, "generator", "Generator"],
  [/\b(24\/7\s+|constant\s+|steady\s+)power|solar|inverter\b/, "power", "Power"],
  [/\b(treated\s+)?water|borehole\b/, "water", "Water"],
  [/\bestate\b/, "estate", "Estate"],
  [/\bwater[\s-]?front|lagoon|ocean[\s-]?view|sea[\s-]?view\b/, "waterfront", "Waterfront"],
  [/\bsmart[\s-]?home\b/, "smart_home", "Smart home"],
  [/\bgarden\b/, "garden", "Garden"],
  [/\bbq|boys'?\s*quarters?\b/, "bq", "BQ"],
  [/\bbalcon(y|ies)\b/, "balcony", "Balcony"],
  [/\b(lift|elevator)\b/, "elevator", "Elevator"],
  [/\bcinema\b/, "cinema", "Cinema"],
];

const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mil: 1e6,
  mill: 1e6,
  million: 1e6,
  millions: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
};

/** "₦250 million", "250m", "N1.2bn", "250,000,000" → naira. */
export function parseAmount(raw: string): number | null {
  const m = /(?:₦|ngn|n)?\s*(\d+(?:[.,]\d+)*)\s*(k|thousand|m|mil|mill|millions?|b|bn|billion)?\b/i.exec(raw.trim());
  if (!m || !m[1]) return null;
  // Commas are thousands separators in Nigerian usage ("250,000,000"); dots are decimals ("1.2bn").
  const numeric = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return null;
  const mult = m[2] ? MULTIPLIERS[m[2].toLowerCase()] ?? 1 : 1;
  return Math.round(numeric * mult);
}

const AMOUNT = String.raw`(?:₦|ngn|n)?\s*\d+(?:[.,]\d+)*\s*(?:k|thousand|m|mil|mill|millions?|b|bn|billion)?`;

export class RuleBasedInterpreter implements QueryInterpreter {
  async interpret(text: string, ctx: InterpreterContext): Promise<InterpretedQuery> {
    const t = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
    const filters: SearchFilters = {};
    const understood: string[] = [];

    // Transaction type
    if (/\b(rent|rental|to let|lease|per annum|yearly|annually)\b/.test(t)) {
      filters.listingType = "RENT";
      understood.push("For rent");
    } else if (/\b(buy|purchase|for sale|own|sale)\b/.test(t)) {
      filters.listingType = "SALE";
      understood.push("For sale");
    }

    // Bedrooms: "4 bedroom", "4-bed", "four bedroom", "4br"
    const bed = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight)\s*[- ]?(bed(room)?s?|br|bdr)\b/.exec(t);
    if (bed?.[1]) {
      const n = WORD_NUMBERS[bed[1]] ?? Number(bed[1]);
      if (n > 0) {
        filters.minBedrooms = n;
        understood.push(`${n}+ bedrooms`);
      }
    }

    // Budget
    const between = new RegExp(String.raw`\bbetween\s+(${AMOUNT})\s+(?:and|-|to)\s+(${AMOUNT})`).exec(t);
    const under = new RegExp(String.raw`\b(?:under|below|less than|max(?:imum)?|up to|not more than|within)\s+(${AMOUNT})`).exec(t);
    const over = new RegExp(String.raw`\b(?:over|above|more than|min(?:imum)?|from|at least)\s+(${AMOUNT})`).exec(t);
    if (between?.[1] && between[2]) {
      const lo = parseAmount(between[1]);
      const hi = parseAmount(between[2]);
      if (lo !== null) filters.minPrice = lo;
      if (hi !== null) filters.maxPrice = hi;
    } else {
      if (under?.[1]) {
        const v = parseAmount(under[1]);
        if (v !== null) filters.maxPrice = v;
      }
      if (over?.[1]) {
        const v = parseAmount(over[1]);
        if (v !== null) filters.minPrice = v;
      }
    }
    if (filters.minPrice !== undefined) understood.push(`From ₦${compact(filters.minPrice)}`);
    if (filters.maxPrice !== undefined) understood.push(`Up to ₦${compact(filters.maxPrice)}`);

    // Property type (first match wins; more specific patterns are listed first)
    for (const [re, type, label] of TYPE_PATTERNS) {
      if (re.test(t)) {
        filters.propertyTypes = [type];
        understood.push(label);
        break;
      }
    }

    // Qualities
    if (/\bluxury|luxurious|high[\s-]?end|exclusive|premium\b/.test(t)) {
      filters.luxury = true;
      understood.push("Luxury");
    }
    if (/\b(fully[\s-]?)?furnished\b/.test(t) && !/\bunfurnished\b/.test(t)) {
      filters.furnished = true;
      understood.push("Furnished");
    }
    if (/\bserviced\b/.test(t)) {
      filters.serviced = true;
      understood.push("Serviced");
    }
    if (/\boff[\s-]?plan\b/.test(t)) {
      filters.offPlan = true;
      understood.push("Off-plan");
    }
    if (/\b(new|newly)[\s-]?(build|built|construction)\b/.test(t)) {
      filters.newConstruction = true;
      understood.push("New construction");
    }
    if (/\bverified\b/.test(t)) {
      filters.verified = true;
      understood.push("Verified listings");
    }

    const amenities: AmenityKey[] = [];
    for (const [re, key, label] of AMENITY_PATTERNS) {
      // "estate" as an amenity only when it isn't part of "real estate".
      if (key === "estate" && /\breal estate\b/.test(t)) continue;
      if (re.test(t) && !amenities.includes(key)) {
        amenities.push(key);
        understood.push(label);
      }
    }
    if (amenities.length) filters.amenities = amenities;

    // Location: prefer areas over states, then the longest matching name ("banana island" > "island").
    let best: { path: string; name: string; score: number } | null = null;
    for (const loc of ctx.locations) {
      for (const name of loc.names) {
        const re = new RegExp(String.raw`\b${escapeRegExp(name.toLowerCase())}\b`);
        const score = (loc.path.includes("/") ? 1000 : 0) + name.length;
        if (re.test(t) && (!best || score > best.score)) best = { path: loc.path, name, score };
      }
    }
    if (best) {
      filters.location = best.path;
      understood.push(titleCase(best.name));
    }

    return { filters, understood };
  }
}

function compact(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(0)}K`;
  return String(n);
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
