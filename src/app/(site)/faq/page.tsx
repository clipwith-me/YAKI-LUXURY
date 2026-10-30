import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { FAQ } from "@/content/faq";

export const metadata: Metadata = { title: "Frequently Asked Questions", alternates: { canonical: "/faq" } };

export default function FaqPage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <PageHero crumbs={[{ label: "FAQ" }]} eyebrow="Help" title="Frequently asked questions" />
      <div className="container-page max-w-3xl py-14">
        {FAQ.map((f) => (
          <details key={f.q} className="group border-b border-stone-200 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl">{f.q}<span className="text-stone-400 transition group-open:rotate-45">+</span></summary>
            <p className="mt-3 text-[15px] leading-7 text-stone-600">{f.a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
