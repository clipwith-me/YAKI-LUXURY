import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { PropertyImage } from "@/components/property/property-image";
import { EmptyState, ButtonLink } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { propertiesByIds } from "@/server/queries/public";
import { locationLabel, priceLabel, propertyHref, typeLabel } from "@/lib/property-format";

export const metadata: Metadata = { title: "Compare Properties", robots: { index: false } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? "").split(",").filter((s) => /^[a-z0-9]{10,40}$/.test(s));
  const items = await propertiesByIds(ids);
  const rows: Array<[string, (p: (typeof items)[number]) => string]> = [
    ["Price", (p) => priceLabel(p)],
    ["Location", (p) => locationLabel(p)],
    ["Type", (p) => typeLabel(p.propertyType)],
    ["Bedrooms", (p) => String(p.bedrooms || "—")],
    ["Bathrooms", (p) => String(p.bathrooms || "—")],
    ["Size", (p) => (p.sizeSqm ? `${p.sizeSqm.toLocaleString()} m²` : "—")],
    ["Plot", (p) => (p.plotSizeSqm ? `${p.plotSizeSqm.toLocaleString()} m²` : "—")],
    ["Parking", (p) => String(p.parkingSpaces ?? "—")],
    ["Furnished", (p) => (p.furnished ? "Yes" : "No")],
    ["Serviced", (p) => (p.serviced ? "Yes" : "No")],
    ["Amenities", (p) => p.amenities.map((a) => a.amenity.label).join(", ") || "—"],
    ["Partner", (p) => p.partner.companyName],
    ["Verification", (p) => (p.verifications.length ? `${p.verifications.length} active check(s)` : "Not verified")],
  ];
  return (
    <>
      <PageHero crumbs={[{ label: "Compare" }]} title="Compare properties" description="Side by side, up to four homes." />
      <div className="container-page py-12">
        {items.length < 2 ? (
          <EmptyState icon={<Icon.Compare />} title="Select at least two properties to compare" description="Tap “Compare” on any property card to add it here." action={<ButtonLink href="/properties">Browse properties</ButtonLink>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40" />
                  {items.map((p) => (
                    <th key={p.id} scope="col" className="p-3 text-left align-top font-normal">
                      <Link href={propertyHref(p)} className="group block">
                        <div className="relative aspect-[4/3] bg-stone-100"><PropertyImage src={p.images[0]?.url} alt={p.title} sizes="25vw" /></div>
                        <p className="mt-3 font-display text-xl leading-tight group-hover:underline">{p.title}</p>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, fn]) => (
                  <tr key={label} className="border-t border-stone-200">
                    <th scope="row" className="p-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-stone-500">{label}</th>
                    {items.map((p) => <td key={p.id} className="p-3 align-top">{fn(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
