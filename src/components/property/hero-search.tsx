"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const PRICE_SALE = [[50, "₦50M"], [100, "₦100M"], [250, "₦250M"], [500, "₦500M"], [1000, "₦1B"], [2500, "₦2.5B"]] as const;
const PRICE_RENT = [[5, "₦5M/yr"], [10, "₦10M/yr"], [20, "₦20M/yr"], [40, "₦40M/yr"]] as const;
const TYPES = [["DETACHED_DUPLEX", "Duplex"], ["APARTMENT", "Apartment"], ["PENTHOUSE", "Penthouse"], ["VILLA", "Villa"], ["TERRACE", "Terrace"], ["SEMI_DETACHED_DUPLEX", "Semi-detached"], ["TOWNHOUSE", "Townhouse"], ["LAND", "Land"]] as const;

export function HeroSearch({ locations }: { locations: Array<{ path: string; label: string; group: string }> }) {
  const router = useRouter();
  const [mode, setMode] = useState<"SALE" | "RENT">("SALE");
  const [nl, setNl] = useState(false);
  const groups = [...new Set(locations.map((l) => l.group))];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    if (nl) {
      const q = String(fd.get("nl") ?? "").trim();
      if (q) params.set("nl", q);
    } else {
      params.set("listingType", mode);
      for (const key of ["location", "propertyTypes", "maxPrice", "minBedrooms"]) {
        const v = String(fd.get(key) ?? "");
        if (v) params.set(key, key === "maxPrice" ? String(Number(v) * 1_000_000) : v);
      }
    }
    router.push(`/properties?${params.toString()}`);
  };

  const select = "h-12 w-full appearance-none bg-transparent pr-6 text-[15px] text-ink focus:outline-none";
  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-end justify-between">
        <div role="tablist" aria-label="Search type" className="flex">
          {(["SALE", "RENT"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={!nl && mode === m} onClick={() => { setMode(m); setNl(false); }} className={cn("px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] transition-colors", !nl && mode === m ? "bg-ivory text-ink" : "bg-ink/40 text-ivory/80 backdrop-blur hover:text-ivory")}>
              {m === "SALE" ? "Buy" : "Rent"}
            </button>
          ))}
          <button type="button" role="tab" aria-selected={nl} onClick={() => setNl(true)} className={cn("flex items-center gap-1.5 px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] transition-colors", nl ? "bg-ivory text-ink" : "bg-ink/40 text-ivory/80 backdrop-blur hover:text-ivory")}>
            <Icon.Sparkle size={14} /> Describe it
          </button>
        </div>
      </div>
      <form onSubmit={onSubmit} role="search" className="bg-ivory shadow-lift">
        {nl ? (
          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <label htmlFor="hero-nl" className="sr-only">Describe the home you want</label>
            <input id="hero-nl" name="nl" autoFocus placeholder="e.g. 4 bedroom luxury duplex in Lekki under ₦250 million" className="h-14 flex-1 bg-transparent px-3 text-[16px] text-ink placeholder:text-stone-400 focus:outline-none" />
            <button type="submit" className="flex h-14 items-center justify-center gap-2 bg-ink px-8 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-ink-3">
              <Icon.Search size={16} /> Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-stone-200 md:grid-cols-[1.4fr_1.1fr_1fr_0.9fr_auto] md:divide-x">
            <label className="col-span-2 border-b border-stone-200 px-5 pt-3 md:col-span-1 md:border-b-0">
              <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500">Location</span>
              <select name="location" className={select} defaultValue="">
                <option value="">All of Nigeria</option>
                {groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {locations.filter((l) => l.group === g).map((l) => <option key={l.path} value={l.path}>{l.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="border-b border-stone-200 px-5 pt-3 md:border-b-0">
              <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500">Property type</span>
              <select name="propertyTypes" className={select} defaultValue="">
                <option value="">Any type</option>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="border-b border-l border-stone-200 px-5 pt-3 md:border-b-0 md:border-l-0">
              <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500">Max price</span>
              <select name="maxPrice" className={select} defaultValue="">
                <option value="">No limit</option>
                {(mode === "SALE" ? PRICE_SALE : PRICE_RENT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="px-5 pt-3">
              <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500">Bedrooms</span>
              <select name="minBedrooms" className={select} defaultValue="">
                <option value="">Any</option>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
            <button type="submit" className="col-span-2 flex h-16 items-center justify-center gap-2 bg-ink px-10 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-ink-3 md:col-span-1 md:h-auto">
              <Icon.Search size={16} /> Search
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
