"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const TYPES = [["DETACHED_DUPLEX", "Detached duplex"], ["SEMI_DETACHED_DUPLEX", "Semi-detached"], ["TERRACE", "Terrace"], ["APARTMENT", "Apartment"], ["PENTHOUSE", "Penthouse"], ["VILLA", "Villa"], ["MAISONETTE", "Maisonette"], ["BUNGALOW", "Bungalow"], ["TOWNHOUSE", "Townhouse"], ["LAND", "Land"], ["COMMERCIAL", "Commercial"]] as const;
const AMENITIES = [["pool", "Pool"], ["gym", "Gym"], ["security", "Security"], ["parking", "Parking"], ["generator", "Generator"], ["power", "Constant power"], ["water", "Water"], ["estate", "Gated estate"], ["waterfront", "Waterfront"], ["smart_home", "Smart home"], ["garden", "Garden"], ["bq", "BQ"], ["balcony", "Balcony"], ["elevator", "Elevator"]] as const;
const FLAGS = [["furnished", "Furnished"], ["serviced", "Serviced"], ["offPlan", "Off-plan"], ["newConstruction", "New construction"], ["luxury", "Luxury"], ["verified", "Verified listings"]] as const;

type Current = Record<string, string | undefined>;

/** Filters submit as GET params so every search is shareable, bookmarkable and crawlable. */
export function FilterPanel({ current, locations, partners }: { current: Current; locations: Array<{ path: string; label: string; group: string }>; partners: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const types = new Set((current.propertyTypes ?? "").split(",").filter(Boolean));
  const amenities = new Set((current.amenities ?? "").split(",").filter(Boolean));
  const activeCount = Object.entries(current).filter(([k, v]) => v && !["sort", "page", "view", "nl"].includes(k)).length;

  const apply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (typeof v !== "string" || !v) continue;
      if (k === "propertyTypes" || k === "amenities") params.set(k, params.get(k) ? `${params.get(k)},${v}` : v);
      else if (k === "minPrice" || k === "maxPrice") params.set(k, String(Math.round(Number(v) * 1_000_000)));
      else params.set(k, v);
    }
    if (current.sort) params.set("sort", current.sort);
    if (current.view) params.set("view", current.view);
    setOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  };

  const toM = (v?: string) => (v ? String(Number(v) / 1_000_000) : "");
  const label = "mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500";
  const input = "h-11 w-full border border-stone-300 bg-white px-3 text-sm focus:border-ink focus:outline-none";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(buttonClasses("outline", "sm"), "lg:hidden")}>
        <Icon.Settings size={16} /> Filters {activeCount > 0 && `(${activeCount})`}
      </button>
      <div className={cn("lg:block", open ? "fixed inset-0 z-[60] overflow-y-auto bg-ivory p-5 lg:static lg:z-auto lg:bg-transparent lg:p-0" : "hidden")}>
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <p className="font-display text-2xl">Filters</p>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close filters"><Icon.Close size={24} /></button>
        </div>
        <form onSubmit={apply} className="space-y-7" aria-label="Filter properties">
          <fieldset>
            <legend className={label}>Transaction</legend>
            <div className="grid grid-cols-3 gap-1">
              {[["", "All"], ["SALE", "Buy"], ["RENT", "Rent"]].map(([v, l]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="listingType" value={v} defaultChecked={(current.listingType ?? "") === v} className="peer sr-only" />
                  <span className="block border border-stone-300 py-2 text-center text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-brass-500">{l}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="f-loc" className={label}>Location / neighbourhood</label>
            <select id="f-loc" name="location" defaultValue={current.location ?? ""} className={input}>
              <option value="">All locations</option>
              {[...new Set(locations.map((l) => l.group))].map((g) => (
                <optgroup key={g} label={g}>
                  <option value={locations.find((l) => l.group === g)?.path.split("/")[0]}>All of {g}</option>
                  {locations.filter((l) => l.group === g).map((l) => <option key={l.path} value={l.path}>{l.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Price (₦ millions)</span>
            <div className="grid grid-cols-2 gap-2">
              <label><span className="sr-only">Minimum price in millions</span><input name="minPrice" inputMode="decimal" placeholder="Min" defaultValue={toM(current.minPrice)} className={input} /></label>
              <label><span className="sr-only">Maximum price in millions</span><input name="maxPrice" inputMode="decimal" placeholder="Max" defaultValue={toM(current.maxPrice)} className={input} /></label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="f-beds" className={label}>Bedrooms</label>
              <select id="f-beds" name="minBedrooms" defaultValue={current.minBedrooms ?? ""} className={input}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-baths" className={label}>Bathrooms</label>
              <select id="f-baths" name="minBathrooms" defaultValue={current.minBathrooms ?? ""} className={input}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="f-size" className={label}>Minimum size (m²)</label>
            <input id="f-size" name="minSize" inputMode="numeric" defaultValue={current.minSize ?? ""} className={input} />
          </div>
          <fieldset>
            <legend className={label}>Property type</legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {TYPES.map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" name="propertyTypes" value={v} defaultChecked={types.has(v)} className="accent-[#0f1113]" />{l}</label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={label}>Listing</legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {FLAGS.map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" name={k} value="1" defaultChecked={current[k] === "1"} className="accent-[#0f1113]" />{l}</label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={label}>Amenities</legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {AMENITIES.map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" name="amenities" value={v} defaultChecked={amenities.has(v)} className="accent-[#0f1113]" />{l}</label>
              ))}
            </div>
          </fieldset>
          {partners.length > 0 && (
            <div>
              <label htmlFor="f-partner" className={label}>Partner</label>
              <select id="f-partner" name="partner" defaultValue={current.partner ?? ""} className={input}>
                <option value="">All partners</option>
                {partners.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="sticky bottom-0 flex gap-2 bg-ivory py-3 lg:static lg:bg-transparent lg:p-0">
            <button type="submit" className={cn(buttonClasses("primary", "md"), "flex-1")}>Apply filters</button>
            <button type="button" onClick={() => { setOpen(false); router.push(pathname); }} className={buttonClasses("ghost", "md")}>Clear</button>
          </div>
        </form>
      </div>
    </>
  );
}
