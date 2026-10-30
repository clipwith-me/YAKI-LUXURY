import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { PropertyCard } from "@/components/property/property-card";
import { Badge, ButtonLink, EmptyState, Notice } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { favoriteIds } from "@/server/services/customers";
import { publicPropertyWhere, propertyCardSelect } from "@/server/services/properties";
import { activeBadgeWhere, BADGE_COPY } from "@/server/services/verification";

type Props = { params: Promise<{ slug: string }> };
const load = cache((slug: string) =>
  db.partner.findFirst({
    where: { slug, status: "APPROVED", deletedAt: null },
    // Only public profile fields — never internal notes, registration numbers or documents.
    select: { id: true, slug: true, companyName: true, type: true, description: true, areasServed: true, propertyCategories: true, approvedAt: true, website: true, city: true, state: true, isDemo: true, verifications: { where: activeBadgeWhere(), select: { category: true, verifiedAt: true } } },
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: `${p.companyName} — Property Partner`, description: p.description ?? undefined, alternates: { canonical: `/partners/${p.slug}` }, robots: p.isDemo ? { index: false } : undefined } : { title: "Partner not found" };
}

export default async function PartnerProfile({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const [user, properties] = await Promise.all([getSessionUser(), db.property.findMany({ where: { ...publicPropertyWhere(), partnerId: p.id }, select: propertyCardSelect, orderBy: { publishedAt: "desc" }, take: 24 })]);
  const saved = await favoriteIds(user?.id);
  return (
    <>
      <PageHero crumbs={[{ label: "Partners", href: "/partners" }, { label: p.companyName }]} eyebrow={p.type.replace(/_/g, " ").toLowerCase()} title={p.companyName} description={p.description ?? undefined}>
        <div className="mt-6 flex flex-wrap gap-2">
          {p.verifications.map((v) => <Badge key={v.category} tone={v.category === "FEATURED_PARTNER" ? "brass" : "trust"}><Icon.Shield size={12} /> {BADGE_COPY[v.category].label} · {v.verifiedAt?.toLocaleDateString("en-NG", { month: "short", year: "numeric" })}</Badge>)}
          {p.approvedAt && <Badge tone="outline">Partner since {p.approvedAt.getFullYear()}</Badge>}
          {p.isDemo && <Badge tone="warning">DEMO PARTNER</Badge>}
        </div>
      </PageHero>
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6 text-sm">
          <div><p className="eyebrow">Based in</p><p className="mt-2">{p.city}, {p.state}</p></div>
          {p.areasServed.length > 0 && <div><p className="eyebrow">Areas served</p><p className="mt-2 leading-6">{p.areasServed.join(" · ")}</p></div>}
          {p.website && <div><p className="eyebrow">Website</p><a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 block underline">{p.website.replace(/^https:\/\//, "")}</a></div>}
          <ButtonLink href={`/contact?partner=${p.slug}`} className="w-full">Contact via YAKI</ButtonLink>
          <Notice tone="neutral">Enquiries are handled by our advisors, who introduce you to the partner.</Notice>
        </aside>
        <section>
          <h2 className="text-3xl">Portfolio <span className="text-stone-400">({properties.length})</span></h2>
          {properties.length === 0 ? (
            <div className="mt-6"><EmptyState title="No live listings right now" description="Check back soon, or create an alert to hear about new listings." /></div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{properties.map((x) => <PropertyCard key={x.id} property={x} saved={saved.has(x.id)} signedIn={!!user} />)}</div>
          )}
        </section>
      </div>
    </>
  );
}
