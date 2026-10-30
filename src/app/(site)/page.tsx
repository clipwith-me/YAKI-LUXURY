import Link from "next/link";
import { HeroSearch } from "@/components/property/hero-search";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyImage } from "@/components/property/property-image";
import { CompareTray } from "@/components/property/property-actions";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { ButtonLink, SectionHeading } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { favoriteIds } from "@/server/services/customers";
import { publicPropertyWhere, propertyCardSelect } from "@/server/services/properties";
import { activeBadgeWhere } from "@/server/services/verification";
import { approvedServiceReviews } from "@/server/services/reviews";
import { publishedArticles, CATEGORY_LABELS } from "@/server/services/articles";
import { locationOptions } from "@/server/queries/public";
import { priceLabel, propertyHref } from "@/lib/property-format";

export const dynamic = "force-dynamic";

const HERO_IMAGE = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2400&q=80";

async function homeData() {
  const live = publicPropertyWhere();
  const [featured, luxury, newest, verified, developments, areas, reviews, articles] = await Promise.all([
    db.property.findMany({ where: { ...live, featured: true }, select: propertyCardSelect, orderBy: { publishedAt: "desc" }, take: 6 }),
    db.property.findMany({ where: { ...live, isLuxury: true }, select: propertyCardSelect, orderBy: { priceKobo: "desc" }, take: 4 }),
    db.property.findMany({ where: live, select: propertyCardSelect, orderBy: { publishedAt: "desc" }, take: 4 }),
    db.property.findMany({ where: { ...live, verifications: { some: activeBadgeWhere() } }, select: propertyCardSelect, orderBy: { publishedAt: "desc" }, take: 3 }),
    db.property.findMany({ where: { ...live, OR: [{ offPlan: true }, { newConstruction: true }] }, select: { ...propertyCardSelect, developmentName: true, completionDate: true }, orderBy: { publishedAt: "desc" }, take: 3 }),
    db.location.findMany({
      where: { type: "AREA", isActive: true, properties: { some: live } },
      select: { name: true, path: true, heroImage: true, parent: { select: { name: true } }, _count: { select: { properties: { where: live } } } },
      orderBy: { properties: { _count: "desc" } },
      take: 6,
    }),
    approvedServiceReviews(3),
    publishedArticles({ take: 3 }),
  ]);
  return { featured, luxury, newest, verified, developments, areas, reviews, articles };
}

export default async function HomePage() {
  const [user, data, locations] = await Promise.all([getSessionUser(), homeData(), locationOptions()]);
  const saved = await favoriteIds(user?.id);
  const signedIn = !!user;
  const card = (p: (typeof data.featured)[number], i = 0) => <PropertyCard key={p.id} property={p} saved={saved.has(p.id)} signedIn={signedIn} priority={i < 2} />;

  return (
    <>
      {/* 1. Hero */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-ink pb-16 pt-32 md:items-center md:pb-0">
        <PropertyImage src={HERO_IMAGE} alt="A contemporary home with a pool at dusk" sizes="100vw" priority className="opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/30" />
        <div className="container-page relative z-10">
          <p className="eyebrow animate-fade-up !text-brass-300">Lagos · Abuja · Across Nigeria</p>
          <h1 className="mt-5 max-w-4xl animate-fade-up text-[2.9rem] leading-[1.02] text-ivory [animation-delay:80ms] sm:text-6xl lg:text-[5.4rem]">Find a Home Worth Coming Home To.</h1>
          <p className="mt-6 max-w-xl animate-fade-up text-base leading-7 text-ivory/80 [animation-delay:160ms] sm:text-lg">Discover exceptional properties from trusted real-estate partners across Nigeria.</p>
          <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms]">
            <ButtonLink href="/properties" variant="brass" size="lg">Explore Properties</ButtonLink>
            <ButtonLink href="/partner-with-us" variant="outline" size="lg" className="border-ivory/70 text-ivory hover:bg-ivory hover:text-ink">Partner With Us</ButtonLink>
          </div>
          <div className="mt-12 animate-fade-up [animation-delay:320ms]">
            <HeroSearch locations={locations} />
          </div>
        </div>
      </section>

      {/* 2. Featured */}
      {data.featured.length > 0 && (
        <section className="container-page py-24">
          <SectionHeading eyebrow="Featured" title="Exceptional homes, carefully presented" description="A curated selection from our partners — each listing reviewed by our team before publication." action={<ButtonLink href="/properties" variant="link">View all properties <Icon.Arrow size={16} /></ButtonLink>} />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.featured.map(card)}</div>
        </section>
      )}

      {/* 3. Locations */}
      {data.areas.length > 0 && (
        <section className="bg-stone-50 py-24">
          <div className="container-page">
            <SectionHeading eyebrow="Explore by location" title="Neighbourhoods we know well" action={<ButtonLink href="/locations" variant="link">All locations <Icon.Arrow size={16} /></ButtonLink>} />
            <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {data.areas.map((a, i) => (
                <Link key={a.path} href={`/locations/${a.path}`} className={`group relative overflow-hidden bg-ink ${i === 0 ? "col-span-2 row-span-2 aspect-square md:col-span-1 md:aspect-auto" : "aspect-[4/5] md:aspect-[4/3]"}`}>
                  <PropertyImage src={a.heroImage} alt={`${a.name}, ${a.parent?.name}`} sizes="(min-width:768px) 33vw, 50vw" className="opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  <div className="absolute bottom-0 p-5 text-ivory">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ivory/70">{a.parent?.name}</p>
                    <p className="font-display text-3xl">{a.name}</p>
                    <p className="mt-1 text-xs text-ivory/70">{a._count.properties} {a._count.properties === 1 ? "property" : "properties"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Luxury collection */}
      {data.luxury.length > 0 && (
        <section className="bg-ink py-24 text-ivory">
          <div className="container-page">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="eyebrow !text-brass-300">The Luxury Collection</p>
                <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">Residences of rare distinction</h2>
                <p className="mt-4 text-ivory/70">Waterfront villas, private penthouses and landmark family homes — presented with discretion.</p>
              </div>
              <ButtonLink href="/luxury" variant="outline" className="border-ivory/50 text-ivory hover:bg-ivory hover:text-ink">Explore the collection</ButtonLink>
            </div>
            <div className="mt-12 grid gap-px bg-ivory/10 md:grid-cols-2">
              {data.luxury.map((p) => (
                <Link key={p.id} href={propertyHref(p)} className="group relative block aspect-[16/10] overflow-hidden bg-ink">
                  <PropertyImage src={p.images[0]?.url} alt={p.images[0]?.alt ?? p.title} sizes="(min-width:768px) 50vw, 100vw" className="opacity-80 transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-brass-300">{p.location.name}{p.isDemo && " · Demo"}</p>
                      <p className="mt-1 font-display text-2xl leading-tight sm:text-3xl">{p.title}</p>
                    </div>
                    <p className="shrink-0 font-display text-2xl">{priceLabel(p, true)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. New listings */}
      {data.newest.length > 0 && (
        <section className="container-page py-24">
          <SectionHeading eyebrow="Just listed" title="New to the marketplace" action={<ButtonLink href="/properties?sort=newest" variant="link">See the latest <Icon.Arrow size={16} /></ButtonLink>} />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{data.newest.map(card)}</div>
        </section>
      )}

      {/* 6. Verified partner properties — only rendered when real verification records exist */}
      {data.verified.length > 0 && (
        <section className="border-y border-stone-200 bg-white py-24">
          <div className="container-page">
            <SectionHeading eyebrow="Verified listings" title="Listings our team has checked" description={<>Each badge describes exactly what we checked and when. Badges are never a legal or title guarantee — <Link href="/legal/verification-policy" className="underline">read our verification policy</Link>.</>} action={<ButtonLink href="/properties?verified=1" variant="link">All verified listings <Icon.Arrow size={16} /></ButtonLink>} />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.verified.map(card)}</div>
          </div>
        </section>
      )}

      {/* 7. Why YAKI */}
      <section className="container-page py-24">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">Why YAKI&apos;S LUXE HOMES</p>
            <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">Trust, designed in.</h2>
            <p className="mt-5 text-[15px] leading-7 text-stone-600">Buying property in Nigeria should feel clear and calm. We built our marketplace around transparency: who is listing, what we checked, and what happens next.</p>
          </div>
          <div className="grid gap-px bg-stone-200 sm:grid-cols-2">
            {[
              { icon: Icon.Building, title: "Clear partner identity", body: "Every listing shows exactly which partner is marketing it. We never present ourselves as the seller." },
              { icon: Icon.Shield, title: "Honest verification", body: "Badges appear only when our team has completed a specific check — with the date and scope stated." },
              { icon: Icon.Key, title: "Reviewed before publishing", body: "Partners can't publish directly. Every listing is reviewed by our team before it goes live." },
              { icon: Icon.User, title: "Your details, protected", body: "We introduce you to a partner only when you're ready. Your contact details are never put on public display." },
            ].map(({ icon: I, title, body }) => (
              <div key={title} className="bg-ivory p-8">
                <I size={24} className="text-brass-600" />
                <h3 className="mt-5 text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. How it works */}
      <section className="bg-stone-50 py-24">
        <div className="container-page">
          <SectionHeading align="center" eyebrow="How it works" title="From first look to keys in hand" />
          <ol className="mt-14 grid gap-10 md:grid-cols-4">
            {[
              ["Discover", "Search by neighbourhood, budget and lifestyle — or simply describe the home you want."],
              ["Enquire", "Request a viewing or information. You'll receive a reference number instantly."],
              ["Get introduced", "An advisor confirms your needs and introduces you to the listing partner."],
              ["Transact with confidence", "View, negotiate and complete directly with the partner, with your own lawyer."],
            ].map(([t, d], i) => (
              <li key={t} className="relative border-t border-ink pt-6">
                <span className="font-display text-5xl text-brass-500">0{i + 1}</span>
                <h3 className="mt-3 text-2xl">{t}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center"><ButtonLink href="/how-it-works" variant="link">Learn more about our process <Icon.Arrow size={16} /></ButtonLink></div>
        </div>
      </section>

      {/* 9. Featured developments */}
      {data.developments.length > 0 && (
        <section className="container-page py-24">
          <SectionHeading eyebrow="New developments" title="Off-plan and newly built" description="Projects from developer partners. Always review payment terms and completion commitments with your lawyer." action={<ButtonLink href="/new-developments" variant="link">All developments <Icon.Arrow size={16} /></ButtonLink>} />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.developments.map(card)}</div>
        </section>
      )}

      {/* 10. Partner with us */}
      <section className="relative overflow-hidden bg-ink py-24 text-ivory">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow !text-brass-300">For developers & agencies</p>
            <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">Reach serious buyers. Track every referral.</h2>
            <p className="mt-5 max-w-lg text-ivory/70">Showcase your inventory to qualified buyers, receive leads with full attribution, and manage listings, viewings and deals from one partner portal.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/partner-with-us/apply" variant="brass" size="lg">Apply to become a partner</ButtonLink>
              <ButtonLink href="/partner-with-us" variant="outline" size="lg" className="border-ivory/50 text-ivory hover:bg-ivory hover:text-ink">How partnership works</ButtonLink>
            </div>
          </div>
          <ul className="grid gap-px bg-ivory/10 sm:grid-cols-2">
            {["Qualified, attributed leads", "Listing review & presentation", "Viewing & deal tracking", "Transparent referral terms"].map((t) => (
              <li key={t} className="flex items-center gap-3 bg-ink p-6 text-sm"><Icon.Check className="text-brass-300" /> {t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 11. Testimonials — only real, moderated reviews. Otherwise our commitments. */}
      <section className="container-page py-24">
        {data.reviews.length > 0 ? (
          <>
            <SectionHeading align="center" eyebrow="Client stories" title="In their words" />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {data.reviews.map((r) => (
                <figure key={r.id} className="border border-stone-200 bg-white p-8">
                  <p aria-label={`${r.rating} out of 5`} className="text-brass-500">{"★".repeat(r.rating)}</p>
                  <blockquote className="mt-4 font-display text-xl leading-snug">“{r.body}”</blockquote>
                  <figcaption className="mt-6 text-sm text-stone-500">{r.author.name.split(" ")[0]}</figcaption>
                </figure>
              ))}
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Our commitments</p>
            <p className="mt-6 font-display text-3xl leading-snug sm:text-4xl">“We will never claim a check we haven&apos;t done, never ask you to send purchase money through us, and never share your details without your consent.”</p>
            <p className="mt-6 text-sm text-stone-500">Client reviews will appear here once verified customers share their experience.</p>
          </div>
        )}
      </section>

      {/* 12. Journal */}
      {data.articles.length > 0 && (
        <section className="border-t border-stone-200 bg-white py-24">
          <div className="container-page">
            <SectionHeading eyebrow="Real Estate Journal" title="Insight for considered decisions" action={<ButtonLink href="/journal" variant="link">Read the Journal <Icon.Arrow size={16} /></ButtonLink>} />
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {data.articles.map((a) => (
                <Link key={a.id} href={`/journal/${a.slug}`} className="group">
                  <div className="relative aspect-[3/2] overflow-hidden bg-stone-100"><PropertyImage src={a.coverImage} alt="" sizes="(min-width:768px) 33vw, 100vw" className="transition duration-700 group-hover:scale-105" /></div>
                  <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-brass-600">{CATEGORY_LABELS[a.category]}{a.isDemo && " · Sample"}</p>
                  <h3 className="mt-2 text-2xl leading-snug group-hover:underline">{a.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-stone-600">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 13 + 14. Alerts & newsletter */}
      <section className="bg-stone-50 py-24">
        <div className="container-page grid gap-px bg-stone-200 md:grid-cols-2">
          <div className="bg-stone-50 p-8 md:p-12">
            <Icon.Bell size={26} className="text-brass-600" />
            <h2 className="mt-5 text-3xl">Property alerts</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">“Notify me when a 4-bedroom under ₦200M appears in Lekki.” Save any search and we&apos;ll tell you the moment a match is listed.</p>
            <ButtonLink href={signedIn ? "/properties" : "/register?next=/properties"} className="mt-6">{signedIn ? "Search & save an alert" : "Create a free account"}</ButtonLink>
          </div>
          <div className="bg-stone-50 p-8 md:p-12">
            <Icon.Mail size={26} className="text-brass-600" />
            <h2 className="mt-5 text-3xl">The Journal, monthly</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">Neighbourhood guides, buying advice and new collections — no noise.</p>
            <NewsletterForm source="home" />
          </div>
        </div>
      </section>

      {/* 15. Final CTA */}
      <section className="container-page py-28 text-center">
        <p className="eyebrow">Begin</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-4xl leading-tight sm:text-6xl">Your next chapter starts with the right address.</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/properties" size="lg">Explore properties</ButtonLink>
          <ButtonLink href="/contact" variant="outline" size="lg">Speak with an advisor</ButtonLink>
        </div>
      </section>
      <CompareTray />
    </>
  );
}
