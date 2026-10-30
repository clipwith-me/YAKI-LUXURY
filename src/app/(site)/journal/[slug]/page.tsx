import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PropertyImage } from "@/components/property/property-image";
import { Notice, ButtonLink } from "@/components/ui/primitives";
import { db } from "@/server/db";
import { CATEGORY_LABELS } from "@/server/services/articles";
import { renderSimpleMarkdown } from "@/lib/markdown";
import { absoluteUrl, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };
const load = cache((slug: string) => db.article.findFirst({ where: { slug, status: "PUBLISHED" } }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load((await params).slug);
  if (!a) return { title: "Article not found" };
  return { title: a.seoTitle ?? a.title, description: a.seoDescription ?? a.excerpt, alternates: { canonical: `/journal/${a.slug}` }, openGraph: { type: "article", title: a.title, description: a.excerpt, images: a.coverImage ? [a.coverImage] : [] } };
}

export default async function ArticlePage({ params }: Props) {
  const a = await load((await params).slug);
  if (!a) notFound();
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: a.title, datePublished: a.publishedAt?.toISOString(), dateModified: a.updatedAt.toISOString(), author: { "@type": "Organization", name: a.authorName }, publisher: { "@type": "Organization", name: site.name }, image: a.coverImage ? [a.coverImage] : undefined, mainEntityOfPage: absoluteUrl(`/journal/${a.slug}`) };
  return (
    <article className="pt-28">
      <div className="mx-auto max-w-3xl px-4">
        <Breadcrumbs items={[{ label: "Journal", href: "/journal" }, { label: CATEGORY_LABELS[a.category], href: `/journal?category=${a.category}` }, { label: a.title }]} />
        <p className="eyebrow mt-8">{CATEGORY_LABELS[a.category]}</p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{a.title}</h1>
        <p className="mt-5 text-lg text-stone-600">{a.excerpt}</p>
        <p className="mt-6 text-xs text-stone-500">{a.authorName} · {a.publishedAt?.toLocaleDateString("en-NG", { dateStyle: "long" })}</p>
      </div>
      {a.coverImage && <div className="relative mx-auto mt-10 aspect-[21/9] max-w-[1320px] bg-stone-100"><PropertyImage src={a.coverImage} alt="" sizes="100vw" priority /></div>}
      <div className="prose-lux mx-auto max-w-3xl px-4 py-12 text-[17px] leading-8">
        {a.isDemo && <Notice tone="warning">Sample article for demonstration purposes.</Notice>}
        {renderSimpleMarkdown(a.body)}
        <Notice className="mt-10" tone="neutral">This article is general information, not legal, financial or tax advice. Consult a qualified professional about your circumstances.</Notice>
        <div className="mt-10 flex flex-wrap gap-3 not-prose"><ButtonLink href="/properties">Explore properties</ButtonLink><ButtonLink href="/contact" variant="outline">Speak with an advisor</ButtonLink></div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </article>
  );
}
