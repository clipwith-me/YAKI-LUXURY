import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-hero";
import { Notice } from "@/components/ui/primitives";
import { LEGAL_DOCS, LEGAL_REVIEW_NOTICE } from "@/content/legal";
import { getSetting } from "@/server/settings";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;
export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = LEGAL_DOCS[(await params).slug];
  return doc ? { title: doc.title, description: doc.summary, alternates: { canonical: `/legal/${(await params).slug}` } } : {};
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;
  const doc = LEGAL_DOCS[slug];
  if (!doc) notFound();
  // Prerendered at build time, possibly without a database: fall back to showing the draft notice.
  const reviewed = await getSetting("legal.reviewedByCounsel").catch(() => false);
  return (
    <>
      <PageHero crumbs={[{ label: "Legal" }, { label: doc.title }]} eyebrow="Legal & trust" title={doc.title} description={doc.summary} />
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Legal documents" className="text-sm">
          <ul className="space-y-2">{Object.entries(LEGAL_DOCS).map(([s, d]) => <li key={s}><Link href={`/legal/${s}`} className={s === slug ? "font-medium text-ink" : "text-stone-500 hover:text-ink"}>{d.title}</Link></li>)}</ul>
        </nav>
        <div className="prose-lux max-w-3xl">
          {!reviewed && <Notice tone="warning" title="Draft for legal review">{LEGAL_REVIEW_NOTICE}</Notice>}
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.body.map((b, i) => <p key={i}>{b}</p>)}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
