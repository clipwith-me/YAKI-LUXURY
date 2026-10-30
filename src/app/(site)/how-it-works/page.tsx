import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "How It Works", description: "How YAKI'S LUXE HOMES connects buyers and renters with trusted property partners.", alternates: { canonical: "/how-it-works" } };

const BUYERS = [
  ["Search or describe", "Filter by area, budget and amenities, or type what you want in plain English."],
  ["Enquire in one step", "Request a viewing, information or a call. You receive a lead reference such as YLH-2026-00482 immediately."],
  ["Speak with an advisor", "We confirm your needs and introduce you to the listing partner — your details stay private until then."],
  ["View and negotiate", "Visit the property, ask questions and negotiate directly with the partner."],
  ["Complete with your lawyer", "Carry out independent legal checks and pay only the contracting party. We never take property payments."],
];
const PARTNERS = [
  ["Apply", "Tell us about your company, areas served and the properties you market."],
  ["Get approved", "Our partner team reviews your application and agrees commercial terms with you."],
  ["List", "Submit properties from your portal. Each listing is reviewed before publication."],
  ["Receive leads", "Get notified of every enquiry with a lead reference; we introduce qualified clients."],
  ["Close & settle", "Record viewings, offers and closings. Referral commission is calculated transparently from your agreement."],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero crumbs={[{ label: "How It Works" }]} eyebrow="How it works" title="Simple for buyers. Accountable for partners." />
      <div className="container-page grid gap-16 py-20 lg:grid-cols-2">
        {[["For buyers & renters", BUYERS, "/properties", "Start your search"], ["For partners", PARTNERS, "/partner-with-us/apply", "Apply to partner"]].map(([title, steps, href, cta]) => (
          <section key={title as string}>
            <h2 className="text-3xl">{title as string}</h2>
            <ol className="mt-8 space-y-6">
              {(steps as string[][]).map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[48px_1fr] gap-4 border-t border-stone-200 pt-5">
                  <span className="font-display text-3xl text-brass-500">{i + 1}</span>
                  <div><h3 className="text-xl">{t}</h3><p className="mt-1 text-sm leading-6 text-stone-600">{d}</p></div>
                </li>
              ))}
            </ol>
            <ButtonLink href={href as string} className="mt-8">{cta as string}</ButtonLink>
          </section>
        ))}
      </div>
    </>
  );
}
