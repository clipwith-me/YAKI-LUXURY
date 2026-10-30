import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SearchResults } from "@/components/property/search-results";
import { Gallery } from "@/components/property/gallery";
import { InquiryPanel } from "@/components/property/inquiry-panel";
import { MapView } from "@/components/property/map-view";
import { PropertyCard } from "@/components/property/property-card";
import { SaveButton, ShareButton, WhatsAppShare } from "@/components/property/property-actions";
import { Badge, Notice } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { getAllSettings } from "@/server/settings";
import { favoriteIds } from "@/server/services/customers";
import { publicPropertyWhere, propertyCardSelect } from "@/server/services/properties";
import { activeBadgeWhere, BADGE_COPY } from "@/server/services/verification";
import { track } from "@/server/services/analytics";
import { visitorHash } from "@/server/request";
import { absoluteUrl } from "@/lib/site";
import { koboToNaira } from "@/lib/money";
import { whatsappNumber } from "@/lib/phone";
import { locationLabel, priceLabel, propertyHref, typeLabel } from "@/lib/property-format";

type Props = { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const getProperty = cache(async (path: string, slug: string) =>
  db.property.findFirst({
    where: { slug, location: { path }, ...publicPropertyWhere() },
    include: {
      location: { include: { parent: true } },
      partner: { select: { id: true, slug: true, companyName: true, type: true, approvedAt: true, description: true, isDemo: true, verifications: { where: activeBadgeWhere(), select: { category: true, verifiedAt: true, publicNote: true } } } },
      images: { orderBy: { sortOrder: "asc" } },
      videos: true,
      amenities: { include: { amenity: true } },
      verifications: { where: { OR: [activeBadgeWhere(), { status: "PENDING" }] }, select: { category: true, status: true, verifiedAt: true, reviewDueAt: true, publicNote: true } },
    },
  }),
);

const getLocation = cache(async (path: string) => db.location.findFirst({ where: { path, isActive: true }, include: { parent: true } }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments } = await params;
  if (segments.length === 3) {
    const [state, area, slug] = segments as [string, string, string];
    const p = await getProperty(`${state}/${area}`, slug);
    if (!p) return { title: "Property not found" };
    const description = `${p.bedrooms ? `${p.bedrooms}-bedroom ` : ""}${typeLabel(p.propertyType).toLowerCase()} ${p.listingType === "RENT" ? "for rent" : "for sale"} in ${p.location.name}, ${p.location.parent?.name}. ${priceLabel(p)}. Listed by ${p.partner.companyName}.`;
    return {
      title: `${p.title} — ${p.location.name}`,
      description,
      alternates: { canonical: propertyHref(p) },
      openGraph: { title: p.title, description, url: propertyHref(p), images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].alt }] : [] },
      robots: p.isDemo ? { index: false, follow: true } : undefined,
    };
  }
  const loc = await getLocation(segments.slice(0, 2).join("/"));
  if (!loc) return { title: "Location not found" };
  return { title: `Properties in ${loc.name}${loc.parent ? `, ${loc.parent.name}` : ""}`, alternates: { canonical: `/properties/${loc.path}` } };
}

export default async function PropertyRoute({ params, searchParams }: Props) {
  const { segments } = await params;
  if (segments.length === 1 || segments.length === 2) {
    // /properties/lagos and /properties/lagos/lekki — SEO landing pages backed by live search.
    const loc = await getLocation(segments.join("/"));
    if (!loc) notFound();
    const crumbs = [{ label: "Properties", href: "/properties" }, ...(loc.parent ? [{ label: loc.parent.name, href: `/properties/${loc.parent.path}` }] : []), { label: loc.name }];
    return (
      <>
        <PageHero crumbs={crumbs} eyebrow={loc.parent?.name ?? "Nigeria"} title={`Properties in ${loc.name}`} description={loc.description ?? undefined} image={loc.heroImage} />
        <SearchResults searchParams={await searchParams} preset={{ location: loc.path }} basePath={`/properties/${loc.path}`} />
      </>
    );
  }
  if (segments.length !== 3) notFound();
  const [state, area, slug] = segments as [string, string, string];
  const p = await getProperty(`${state}/${area}`, slug);
  if (!p) notFound();

  const [user, settings] = await Promise.all([getSessionUser(), getAllSettings()]);
  const [saved, similar] = await Promise.all([
    favoriteIds(user?.id),
    db.property.findMany({ where: { ...publicPropertyWhere(), id: { not: p.id }, listingType: p.listingType, OR: [{ locationId: p.locationId }, { propertyType: p.propertyType }] }, select: propertyCardSelect, orderBy: { publishedAt: "desc" }, take: 3 }),
  ]);
  void track({ type: "PROPERTY_VIEW", propertyId: p.id, partnerId: p.partnerId, userId: user?.id, visitorHash: await visitorHash() });

  const url = absoluteUrl(propertyHref(p));
  const advisor = settings["contact.advisorWhatsapp"];
  const activeBadges = p.verifications.filter((v) => v.status === "ACTIVE");
  const pendingBadges = p.verifications.filter((v) => v.status === "PENDING");
  const showAddress = p.showExactAddress && settings["features.showExactAddresses"];
  const amenityGroups = p.amenities.reduce<Record<string, string[]>>((acc, a) => ((acc[a.amenity.category] ??= []).push(a.amenity.label), acc), {});

  const facts: Array<[string, string | number | null | undefined]> = [
    ["Property reference", p.reference],
    ["Type", typeLabel(p.propertyType)],
    ["Listing", p.listingType === "RENT" ? "For rent" : "For sale"],
    ["Availability", p.availability.replace("_", " ").toLowerCase()],
    ["Bedrooms", p.bedrooms || null],
    ["Bathrooms", p.bathrooms || null],
    ["Internal size", p.sizeSqm ? `${p.sizeSqm.toLocaleString()} m²` : null],
    ["Plot size", p.plotSizeSqm ? `${p.plotSizeSqm.toLocaleString()} m²` : null],
    ["Parking", p.parkingSpaces ?? null],
    ["Furnished", p.furnished ? "Yes" : "No"],
    ["Serviced", p.serviced ? "Yes" : "No"],
    ["Partner reference", p.partnerReference],
    ["Last updated", p.updatedAt.toLocaleDateString("en-NG", { dateStyle: "medium" })],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    url,
    datePosted: p.publishedAt?.toISOString(),
    image: p.images.map((i) => i.url),
    description: p.description.slice(0, 500),
    offers: p.priceOnRequest ? undefined : { "@type": "Offer", price: koboToNaira(p.priceKobo), priceCurrency: "NGN", availability: p.availability === "AVAILABLE" ? "https://schema.org/InStock" : "https://schema.org/SoldOut", seller: { "@type": "Organization", name: p.partner.companyName } },
    about: {
      "@type": p.propertyType === "APARTMENT" || p.propertyType === "PENTHOUSE" ? "Apartment" : "SingleFamilyResidence",
      numberOfRooms: p.bedrooms || undefined,
      numberOfBathroomsTotal: p.bathrooms || undefined,
      floorSize: p.sizeSqm ? { "@type": "QuantitativeValue", value: p.sizeSqm, unitCode: "MTK" } : undefined,
      address: { "@type": "PostalAddress", addressLocality: p.location.name, addressRegion: p.location.parent?.name, addressCountry: "NG" },
    },
  };

  return (
    <article className="pt-[72px]">
      <div className="container-page py-5">
        <Breadcrumbs items={[{ label: "Properties", href: "/properties" }, { label: p.location.parent?.name ?? "", href: `/properties/${p.location.parent?.path}` }, { label: p.location.name, href: `/properties/${p.location.path}` }, { label: p.title }]} />
      </div>
      {p.isDemo && (
        <div className="container-page mb-4">
          <Notice tone="warning" title="DEMO LISTING">This property and its partner are fictional, shown only to demonstrate the platform. Enquiries are recorded as test data.</Notice>
        </div>
      )}
      <div className="mx-auto max-w-[1320px] md:px-6 lg:px-10">
        <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt }))} title={p.title} />
      </div>

      <div className="container-page grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="ink">{p.listingType === "RENT" ? "For Rent" : "For Sale"}</Badge>
            {p.isLuxury && <Badge tone="brass">Luxury Collection</Badge>}
            {p.offPlan && <Badge>Off-plan</Badge>}
            {p.newConstruction && <Badge>New construction</Badge>}
            {p.availability !== "AVAILABLE" && <Badge tone="warning">{p.availability.replace("_", " ").toLowerCase()}</Badge>}
          </div>
          <h1 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">{p.title}</h1>
          <p className="mt-3 flex items-center gap-1.5 text-stone-600"><Icon.Pin size={16} /> {showAddress ? `${p.addressLine}, ` : ""}{locationLabel(p)}</p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-y border-stone-200 py-6">
            <div>
              <p className="font-display text-4xl tabular-nums sm:text-5xl">{priceLabel(p)}</p>
              <p className="mt-1 text-xs text-stone-500">Ref. {p.reference} · Price as quoted by the listing partner</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SaveButton propertyId={p.id} initial={saved.has(p.id)} signedIn={!!user} variant="inline" />
              <ShareButton propertyId={p.id} title={p.title} url={url} variant="inline" />
              <WhatsAppShare propertyId={p.id} title={p.title} url={url} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-stone-200 sm:grid-cols-4">
            {[
              ["Bedrooms", p.bedrooms || "—", Icon.Bed],
              ["Bathrooms", p.bathrooms || "—", Icon.Bath],
              ["Size", p.sizeSqm ? `${p.sizeSqm.toLocaleString()} m²` : "—", Icon.Area],
              ["Type", typeLabel(p.propertyType), Icon.Home],
            ].map(([label, value, I]) => {
              const Ico = I as typeof Icon.Bed;
              return (
                <div key={label as string} className="bg-ivory p-5">
                  <Ico className="text-brass-600" />
                  <dt className="mt-3 text-[11px] uppercase tracking-[0.16em] text-stone-500">{label as string}</dt>
                  <dd className="mt-1 font-display text-2xl">{value as string}</dd>
                </div>
              );
            })}
          </dl>

          <section className="mt-12" aria-labelledby="about">
            <h2 id="about" className="text-3xl">About this property</h2>
            <div className="prose-lux mt-4 whitespace-pre-line">{p.description}</div>
          </section>

          {p.features.length > 0 && (
            <section className="mt-12" aria-labelledby="features">
              <h2 id="features" className="text-3xl">Features</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {p.features.map((f) => <li key={f} className="flex items-start gap-2 text-[15px] text-stone-700"><Icon.Check size={18} className="mt-0.5 shrink-0 text-brass-600" /> {f}</li>)}
              </ul>
            </section>
          )}

          {Object.keys(amenityGroups).length > 0 && (
            <section className="mt-12" aria-labelledby="amenities">
              <h2 id="amenities" className="text-3xl">Amenities</h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-3">
                {Object.entries(amenityGroups).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">{cat}</p>
                    <ul className="mt-2 space-y-1.5 text-[15px] text-stone-700">{items.map((i) => <li key={i}>{i}</li>)}</ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12" aria-labelledby="facts">
            <h2 id="facts" className="text-3xl">Key facts</h2>
            <dl className="mt-5 grid border-t border-stone-200 sm:grid-cols-2 sm:gap-x-10">
              {facts.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-stone-200 py-3 text-sm">
                  <dt className="text-stone-500">{k}</dt>
                  <dd className="text-right capitalize text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {(p.developmentName || p.offPlan || p.completionDate) && (
            <section className="mt-12 border border-stone-200 bg-white p-6" aria-labelledby="development">
              <h2 id="development" className="text-2xl">Development details</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                {p.developmentName && <div><dt className="text-stone-500">Development</dt><dd className="mt-1">{p.developmentName}</dd></div>}
                {p.developerName && <div><dt className="text-stone-500">Developer</dt><dd className="mt-1">{p.developerName}</dd></div>}
                {p.completionDate && <div><dt className="text-stone-500">Expected completion</dt><dd className="mt-1">{p.completionDate.toLocaleDateString("en-NG", { month: "long", year: "numeric" })} (as stated by developer)</dd></div>}
              </dl>
            </section>
          )}

          <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Media">
            <MediaTile icon={<Icon.Play />} title="Video tour" href={p.videoUrl ?? p.videos[0]?.url} empty="Video available on request" />
            <MediaTile icon={<Icon.Sparkle />} title="Virtual tour" href={p.virtualTourUrl} empty="Virtual tour coming soon" />
            <MediaTile icon={<Icon.Plan />} title="Floor plan" href={p.floorPlanUrl} empty="Floor plan on request" />
          </section>

          <section className="mt-12" aria-labelledby="location">
            <h2 id="location" className="text-3xl">Location</h2>
            <p className="mt-2 text-sm text-stone-600">{p.location.description}</p>
            {p.lat !== null && p.lng !== null && (
              <div className="mt-5"><MapView single points={[{ id: p.id, lat: p.lat, lng: p.lng, title: p.title, price: "", href: "#" }]} height={360} /></div>
            )}
            <p className="mt-2 text-xs text-stone-500">The shaded area shows the approximate neighbourhood. The exact address is shared after you are introduced to the partner.</p>
            <div className="mt-6 border border-dashed border-stone-300 p-5 text-sm text-stone-600">
              <p className="font-medium text-ink">Nearby places</p>
              <p className="mt-1">Ask your advisor about schools, healthcare, shopping and commute times around {p.location.name} — we&apos;ll share what we know and you can see it for yourself at the viewing.</p>
            </div>
          </section>

          <section className="mt-12 grid gap-6 md:grid-cols-2" aria-label="Partner and verification">
            <div className="border border-stone-200 bg-white p-6">
              <p className="eyebrow">Listed by</p>
              <p className="mt-2 font-display text-2xl">{p.partner.companyName}</p>
              <p className="mt-1 text-sm capitalize text-stone-500">{p.partner.type.replace(/_/g, " ").toLowerCase()}{p.partner.approvedAt && ` · Partner since ${p.partner.approvedAt.getFullYear()}`}</p>
              {p.partner.verifications.some((v) => v.category === "PARTNER_VERIFIED") && <p className="mt-3 inline-flex items-center gap-1.5 bg-trust-50 px-2 py-1 text-xs text-trust"><Icon.Shield size={14} /> Verified Partner</p>}
              <Link href={`/partners/${p.partner.slug}`} className="mt-4 flex items-center gap-1 text-sm underline-offset-4 hover:underline">View partner profile <Icon.Arrow size={14} /></Link>
              <p className="mt-4 text-xs leading-5 text-stone-500">The partner is responsible for this listing and the transaction. YAKI&apos;S LUXE HOMES is not the owner or seller.</p>
            </div>
            <div className="border border-stone-200 bg-white p-6">
              <p className="eyebrow">Verification status</p>
              {activeBadges.length > 0 ? (
                <ul className="mt-3 space-y-4">
                  {activeBadges.map((v) => (
                    <li key={v.category}>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-trust"><Icon.Shield size={16} /> {BADGE_COPY[v.category].label}</p>
                      <p className="mt-1 text-xs text-stone-500">Checked {v.verifiedAt?.toLocaleDateString("en-NG", { dateStyle: "medium" })}{v.reviewDueAt && ` · next review ${v.reviewDueAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}`}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-600">{BADGE_COPY[v.category].meaning}</p>
                    </li>
                  ))}
                </ul>
              ) : pendingBadges.length > 0 ? (
                <p className="mt-3 text-sm text-stone-600"><Badge tone="warning">Verification pending</Badge><span className="mt-2 block">Our team has started checks on this listing.</span></p>
              ) : (
                <p className="mt-3 text-sm text-stone-600"><Badge>Not verified</Badge><span className="mt-2 block">This listing was reviewed before publishing but has not received an additional verification check.</span></p>
              )}
              <Link href="/legal/verification-policy" className="mt-4 block text-xs underline">What our badges mean</Link>
            </div>
          </section>

          <Notice className="mt-12" tone="neutral" title="Important">
            Information is provided by the listing partner and may change. YAKI&apos;S LUXE HOMES does not guarantee title, ownership or condition. Always conduct independent checks and take independent legal advice before paying any money. <Link href="/legal/property-disclaimer" className="underline">Property disclaimer</Link>.
          </Notice>
        </div>

        <aside id="enquire" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <InquiryPanel propertyId={p.id} propertyRef={p.reference} title={p.title} isRental={p.listingType === "RENT"} advisorWhatsapp={advisor ? whatsappNumber(advisor) : null} defaults={user ? { name: user.name, email: user.email } : undefined} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="border-t border-stone-200 bg-stone-50 py-20">
          <div className="container-page">
            <h2 className="text-3xl sm:text-4xl">Similar properties</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => <PropertyCard key={s.id} property={s} saved={saved.has(s.id)} signedIn={!!user} />)}
            </div>
          </div>
        </section>
      )}

      {/* Mobile sticky conversion bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-stone-200 bg-ivory/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <a href="#enquire" className="flex h-12 flex-1 items-center justify-center bg-ink text-xs font-medium uppercase tracking-[0.16em] text-ivory">Request a viewing</a>
        {advisor && (
          <a href={`https://wa.me/${whatsappNumber(advisor)}?text=${encodeURIComponent(`Hello, I'm interested in ${p.title} (ref ${p.reference}).`)}`} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="flex h-12 w-12 items-center justify-center border border-stone-300"><Icon.WhatsApp size={20} /></a>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </article>
  );
}

function MediaTile({ icon, title, href, empty }: { icon: React.ReactNode; title: string; href?: string | null; empty: string }) {
  const inner = (
    <>
      <span className="text-brass-600">{icon}</span>
      <span className="mt-4 block font-display text-xl">{title}</span>
      <span className="mt-1 block text-xs text-stone-500">{href ? "Open" : empty}</span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="border border-stone-200 bg-white p-5 transition hover:border-ink">{inner}</a>
  ) : (
    <div className="border border-dashed border-stone-300 p-5 text-stone-400">{inner}</div>
  );
}
