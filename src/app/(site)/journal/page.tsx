import type { Metadata } from "next";
import Link from "next/link";
import type { ArticleCategory } from "@prisma/client";
import { PageHero } from "@/components/layout/page-hero";
import { PropertyImage } from "@/components/property/property-image";
import { EmptyState } from "@/components/ui/primitives";
import { CATEGORY_LABELS, publishedArticles } from "@/server/services/articles";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Real Estate Journal", description: "Buying guides, neighbourhood guides, investment insight and documentation education for property in Nigeria.", alternates: { canonical: "/journal" } };
export const dynamic = "force-dynamic";

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const cat = category && category in CATEGORY_LABELS ? (category as ArticleCategory) : undefined;
  const articles = await publishedArticles({ category: cat });
  const [lead, ...rest] = articles;
  return (
    <>
      <PageHero crumbs={[{ label: "Journal" }]} eyebrow="Real Estate Journal" title="Insight for considered decisions" description="Guides and perspectives to help you buy, rent and invest with clarity. General information only — never a substitute for professional advice." />
      <div className="container-page py-12">
        <nav aria-label="Categories" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <Link href="/journal" className={cn("shrink-0 border px-3 py-1.5 text-xs", !cat ? "border-ink bg-ink text-ivory" : "border-stone-300")}>All</Link>
          {Object.entries(CATEGORY_LABELS).map(([k, l]) => <Link key={k} href={`/journal?category=${k}`} className={cn("shrink-0 border px-3 py-1.5 text-xs", cat === k ? "border-ink bg-ink text-ivory" : "border-stone-300")}>{l}</Link>)}
        </nav>
        {!lead ? (
          <div className="mt-10"><EmptyState title="No articles in this category yet" description="New guides are published regularly." /></div>
        ) : (
          <>
            <Link href={`/journal/${lead.slug}`} className="group mt-10 grid gap-8 md:grid-cols-2">
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100"><PropertyImage src={lead.coverImage} alt="" sizes="50vw" priority className="transition duration-700 group-hover:scale-105" /></div>
              <div className="flex flex-col justify-center">
                <p className="eyebrow">{CATEGORY_LABELS[lead.category]}{lead.isDemo && " · Sample"}</p>
                <h2 className="mt-3 text-4xl leading-tight group-hover:underline">{lead.title}</h2>
                <p className="mt-4 text-stone-600">{lead.excerpt}</p>
                <p className="mt-6 text-xs text-stone-500">{lead.authorName} · {lead.publishedAt?.toLocaleDateString("en-NG", { dateStyle: "long" })}</p>
              </div>
            </Link>
            <div className="mt-16 grid gap-10 md:grid-cols-3">
              {rest.map((a) => (
                <Link key={a.id} href={`/journal/${a.slug}`} className="group">
                  <div className="relative aspect-[3/2] overflow-hidden bg-stone-100"><PropertyImage src={a.coverImage} alt="" sizes="33vw" className="transition duration-700 group-hover:scale-105" /></div>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-brass-600">{CATEGORY_LABELS[a.category]}{a.isDemo && " · Sample"}</p>
                  <h3 className="mt-2 text-2xl group-hover:underline">{a.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-stone-600">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
