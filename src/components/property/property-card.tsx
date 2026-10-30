import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { PropertyImage } from "./property-image";
import { VerificationBadges } from "./verification-badges";
import { CompareToggle, SaveButton, ShareButton } from "./property-actions";
import { absoluteUrl } from "@/lib/site";
import { locationLabel, priceLabel, propertyHref, typeLabel } from "@/lib/property-format";
import type { PropertyCardData } from "@/server/services/properties";
import { cn } from "@/lib/cn";

export function PropertyCard({ property: p, saved, signedIn, layout = "grid", priority }: { property: PropertyCardData; saved: boolean; signedIn: boolean; layout?: "grid" | "list"; priority?: boolean }) {
  const href = propertyHref(p);
  const cover = p.images[0];
  return (
    <article className={cn("group relative bg-white transition-shadow duration-300 hover:shadow-lift", layout === "list" && "grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")}>
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-stone-100" aria-label={p.title}>
        <PropertyImage src={cover?.url} alt={cover?.alt ?? p.title} priority={priority} sizes={layout === "list" ? "(min-width:640px) 40vw, 100vw" : "(min-width:1280px) 30vw, (min-width:768px) 45vw, 100vw"} className="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="ink">{p.listingType === "RENT" ? "For Rent" : "For Sale"}</Badge>
          {p.isLuxury && <Badge tone="brass">Luxury</Badge>}
          {p.offPlan && <Badge tone="neutral">Off-plan</Badge>}
          {p.availability !== "AVAILABLE" && <Badge tone="warning">{p.availability.replace("_", " ").toLowerCase()}</Badge>}
          {p.isDemo && <Badge tone="warning">DEMO</Badge>}
        </div>
      </Link>
      <div className="absolute right-3 top-3 flex gap-2">
        <SaveButton propertyId={p.id} initial={saved} signedIn={signedIn} />
        <ShareButton propertyId={p.id} title={p.title} url={absoluteUrl(href)} />
      </div>
      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[1.65rem] leading-none text-ink tabular-nums">{priceLabel(p, true)}</p>
          <span className="pt-1 text-[11px] uppercase tracking-[0.14em] text-stone-500">{typeLabel(p.propertyType)}</span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-[15px] font-medium leading-snug text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">{p.title}</Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-[13px] text-stone-500">
          <Icon.Pin size={14} /> {locationLabel(p)}
        </p>
        <dl className="mt-4 flex gap-5 border-t border-stone-100 pt-4 text-[13px] text-stone-600">
          {p.bedrooms > 0 && (<div className="flex items-center gap-1.5"><Icon.Bed size={16} /><dt className="sr-only">Bedrooms</dt><dd>{p.bedrooms} bd</dd></div>)}
          {p.bathrooms > 0 && (<div className="flex items-center gap-1.5"><Icon.Bath size={16} /><dt className="sr-only">Bathrooms</dt><dd>{p.bathrooms} ba</dd></div>)}
          {p.sizeSqm && (<div className="flex items-center gap-1.5"><Icon.Area size={16} /><dt className="sr-only">Size</dt><dd>{p.sizeSqm.toLocaleString()} m²</dd></div>)}
        </dl>
        <div className="relative z-10 mt-4 flex items-center justify-between gap-3">
          <p className="truncate text-xs text-stone-500">by <Link href={`/partners/${p.partner.slug}`} className="text-stone-700 hover:underline">{p.partner.companyName}</Link></p>
          <CompareToggle propertyId={p.id} />
        </div>
        <VerificationBadges records={p.verifications} className="relative z-10 mt-3" />
      </div>
    </article>
  );
}
