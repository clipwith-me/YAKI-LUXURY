import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { PropertyImage } from "@/components/property/property-image";
import { db } from "@/server/db";
import { publicPropertyWhere } from "@/server/services/properties";

export const metadata: Metadata = { title: "Locations — Lagos, Abuja and Beyond", description: "Explore neighbourhoods across Lagos and Abuja: Lekki, Ikoyi, Victoria Island, Banana Island, Maitama, Asokoro and more.", alternates: { canonical: "/locations" } };
export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const states = await db.location.findMany({
    where: { type: "STATE", isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { properties: { where: publicPropertyWhere() } } } } } },
  });
  const upcoming = await db.location.findMany({ where: { type: "STATE", isActive: false }, orderBy: { sortOrder: "asc" }, select: { name: true } });
  return (
    <>
      <PageHero crumbs={[{ label: "Locations" }]} eyebrow="Locations" title="Neighbourhoods across Nigeria" description="From the Island's established addresses to the Lekki corridor and the capital's diplomatic districts." />
      <div className="container-page space-y-20 py-16">
        {states.map((s) => (
          <section key={s.id} aria-labelledby={`st-${s.slug}`}>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
              <div><h2 id={`st-${s.slug}`} className="text-4xl">{s.name}</h2><p className="mt-2 max-w-2xl text-sm text-stone-600">{s.description}</p></div>
              <Link href={`/locations/${s.path}`} className="text-sm underline-offset-4 hover:underline">All of {s.name} →</Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {s.children.map((a) => (
                <Link key={a.id} href={`/locations/${a.path}`} className="group relative aspect-[4/3] overflow-hidden bg-ink">
                  <PropertyImage src={a.heroImage} alt={a.name} sizes="(min-width:1024px) 25vw, 50vw" className="opacity-70 transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  <div className="absolute bottom-0 p-4 text-ivory"><p className="font-display text-2xl">{a.name}</p><p className="text-xs text-ivory/70">{a._count.properties} listed</p></div>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {upcoming.length > 0 && (
          <section className="border border-dashed border-stone-300 p-8 text-center">
            <p className="eyebrow">Coming next</p>
            <p className="mt-3 font-display text-2xl">{upcoming.map((u) => u.name).join(" · ")}</p>
            <p className="mt-2 text-sm text-stone-600">Are you a developer or agency in these markets? <Link href="/partner-with-us" className="underline">Partner with us</Link>.</p>
          </section>
        )}
      </div>
    </>
  );
}
