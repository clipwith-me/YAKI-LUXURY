import Link from "next/link";
import { PropertyCard } from "./property-card";
import { FilterPanel } from "./filter-panel";
import { MapView } from "./map-view";
import { CompareTray } from "./property-actions";
import { SaveSearch } from "./save-search";
import { EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { getSessionUser } from "@/server/auth/session";
import { favoriteIds } from "@/server/services/customers";
import { searchProperties, locationIndex } from "@/server/search/engine";
import { filtersToSearchParams, parseSearchParams, type SearchFilters } from "@/server/search/filters";
import { RuleBasedInterpreter } from "@/server/search/interpreter";
import { track } from "@/server/services/analytics";
import { visitorHash } from "@/server/request";
import { approvedPartnerOptions, locationOptions } from "@/server/queries/public";
import { priceLabel, propertyHref } from "@/lib/property-format";
import { cn } from "@/lib/cn";

type Params = Record<string, string | string[] | undefined>;

const SORTS = [["newest", "Featured & newest"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"], ["bedrooms_desc", "Most bedrooms"]] as const;

/**
 * Shared marketplace results used by /properties, /buy, /rent, /luxury, /new-developments and
 * location pages. `preset` filters are fixed by the page; everything else comes from the URL.
 */
export async function SearchResults({ searchParams, preset = {}, basePath }: { searchParams: Params; preset?: Partial<SearchFilters>; basePath: string }) {
  const user = await getSessionUser();
  let filters: SearchFilters = { ...parseSearchParams(searchParams), ...preset };
  const nl = typeof searchParams.nl === "string" ? searchParams.nl.slice(0, 200) : undefined;
  let understood: string[] = [];
  if (nl) {
    // The interpreter is swappable (see QueryInterpreter) — an LLM version can drop in here.
    const res = await new RuleBasedInterpreter().interpret(nl, { locations: await locationIndex() });
    filters = { ...res.filters, ...filters };
    understood = res.understood;
  }
  const view = searchParams.view === "list" ? "list" : searchParams.view === "map" ? "map" : "grid";
  const [result, saved, locations, partners] = await Promise.all([searchProperties(filters, view === "map" ? 60 : 12), favoriteIds(user?.id), locationOptions(), approvedPartnerOptions()]);

  if ((filters.page ?? 1) === 1) {
    void track({ type: "SEARCH", userId: user?.id, visitorHash: await visitorHash(), query: nl ?? filters.q ?? filters.location, metadata: { filters: JSON.parse(JSON.stringify(filters)), results: result.total } });
  }

  const current: Record<string, string | undefined> = Object.fromEntries(filtersToSearchParams(filters));
  current.view = view === "grid" ? undefined : view;
  const withParam = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...current, ...patch }).filter(([, v]) => v !== undefined) as Array<[string, string]>);
    for (const k of Object.keys(preset)) p.delete(k);
    return `${basePath}?${p.toString()}`;
  };
  const alertQuery = filtersToSearchParams(filters).toString();

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
        <FilterPanel current={current} locations={locations} partners={partners} />
      </aside>
      <section aria-labelledby="results-heading">
        {understood.length > 0 && (
          <div className="mb-6 border border-brass-300/60 bg-brass-50 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-brass-700"><Icon.Sparkle size={14} /> We understood</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {understood.map((u) => <li key={u} className="bg-white px-2 py-1 text-xs text-stone-700">{u}</li>)}
            </ul>
            <p className="mt-2 text-xs text-stone-600">“{nl}” — refine with the filters if we missed anything.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <p id="results-heading" className="text-sm text-stone-600" aria-live="polite">
            <span className="font-medium text-ink">{result.total.toLocaleString()}</span> {result.total === 1 ? "property" : "properties"}
          </p>
          <div className="flex items-center gap-2">
            <form action={basePath} className="flex items-center">
              {Object.entries(current).filter(([k, v]) => v && k !== "sort" && !(k in preset)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" name="sort" defaultValue={filters.sort ?? "newest"} className="h-9 border border-stone-300 bg-white px-2 text-[13px]">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button type="submit" className="ml-1 h-9 border border-stone-300 px-2 text-[13px]">Sort</button>
            </form>
            <div className="flex border border-stone-300" role="group" aria-label="View">
              {([["grid", Icon.Grid], ["list", Icon.List], ["map", Icon.Map]] as const).map(([v, I]) => (
                <Link key={v} href={withParam({ view: v === "grid" ? undefined : v, page: undefined })} aria-label={`${v} view`} aria-current={view === v ? "true" : undefined} className={cn("flex h-9 w-9 items-center justify-center", view === v ? "bg-ink text-ivory" : "text-stone-600 hover:bg-stone-100")}>
                  <I size={16} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {result.total === 0 ? (
          <div className="mt-8">
            <EmptyState icon={<Icon.Search />} title="We couldn't find properties matching your current filters." description="Try widening your price range or location — or create an alert and we'll tell you when something matching appears." action={<div className="flex flex-wrap justify-center gap-3"><Link href={basePath} className="text-sm underline">Clear filters</Link>{user && <SaveSearch query={alertQuery} />}</div>} />
          </div>
        ) : view === "map" ? (
          <div className="mt-6">
            <MapView points={result.items.filter((p) => p.lat !== null && p.lng !== null).map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, title: p.title, price: priceLabel(p, true), href: propertyHref(p) }))} />
            <p className="mt-2 text-xs text-stone-500">Pins show approximate neighbourhood locations, not exact addresses.</p>
          </div>
        ) : (
          <div className={cn("mt-6 grid gap-6", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
            {result.items.map((p, i) => <PropertyCard key={p.id} property={p} saved={saved.has(p.id)} signedIn={!!user} layout={view === "list" ? "list" : "grid"} priority={i < 3} />)}
          </div>
        )}

        {result.total > 0 && (
          <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-stone-200 pt-6 sm:flex-row">
            {view !== "map" && result.pageCount > 1 ? (
              <nav aria-label="Pagination" className="flex items-center gap-1">
                {result.page > 1 && <Link href={withParam({ page: String(result.page - 1) })} className="flex h-10 items-center border border-stone-300 px-3 text-sm">Previous</Link>}
                <span className="px-3 text-sm text-stone-600">Page {result.page} of {result.pageCount}</span>
                {result.page < result.pageCount && <Link href={withParam({ page: String(result.page + 1) })} className="flex h-10 items-center border border-stone-300 px-3 text-sm">Next</Link>}
              </nav>
            ) : <span />}
            {user ? <SaveSearch query={alertQuery} /> : <Link href={`/login?next=${encodeURIComponent(basePath)}`} className="flex items-center gap-2 text-sm text-stone-600 hover:text-ink"><Icon.Bell size={16} /> Sign in to create a property alert</Link>}
          </div>
        )}
      </section>
      <CompareTray />
    </div>
  );
}
