import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { ButtonLink, Notice } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Buyer Guide", description: "A step-by-step guide to buying property in Nigeria with confidence.", alternates: { canonical: "/buyer-guide" } };

const STEPS = [
  ["Define your brief", "Budget (including fees and service charges), neighbourhoods, commute, must-have amenities and timing."],
  ["Shortlist and compare", "Use filters, save favourites and compare up to four homes side by side."],
  ["Enquire and view", "Request viewings. Visit in person, at different times of day if you can."],
  ["Engage your own lawyer", "Instruct a lawyer who acts only for you to advise on the documents and searches relevant to the specific property."],
  ["Agree terms in writing", "Price, payment schedule, what's included, and timelines — all in a written agreement reviewed by your lawyer."],
  ["Pay safely", "Pay only the contracting party, into accounts in their name, and keep receipts. Never pay YAKI'S LUXE HOMES for a property."],
];

export default function BuyerGuidePage() {
  return (
    <>
      <PageHero crumbs={[{ label: "Buyer Guide" }]} eyebrow="Buyer guide" title="Buying with confidence" description="A clear sequence for a calm, well-advised purchase." />
      <div className="container-page max-w-3xl py-14">
        <Notice tone="brass">General information only — not legal advice. Requirements vary by property and state; your lawyer will advise on your specific purchase.</Notice>
        <ol className="mt-10 space-y-8">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[56px_1fr] gap-4 border-t border-stone-200 pt-6"><span className="font-display text-4xl text-brass-500">{String(i + 1).padStart(2, "0")}</span><div><h2 className="text-2xl">{t}</h2><p className="mt-2 text-[15px] leading-7 text-stone-600">{d}</p></div></li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-3"><ButtonLink href="/properties">Start your search</ButtonLink><ButtonLink href="/journal?category=BUYING_GUIDES" variant="outline">More buying guides</ButtonLink></div>
      </div>
    </>
  );
}
