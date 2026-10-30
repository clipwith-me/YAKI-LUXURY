import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "About Us", description: "YAKI'S LUXE HOMES is a premium real-estate marketplace connecting serious buyers with trusted property partners in Nigeria.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <>
      <PageHero crumbs={[{ label: "About" }]} eyebrow="About" title="A marketplace built on trust" description="We connect serious buyers and renters with reputable developers and agencies — and we're precise about our role." image="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2400&q=80" />
      <div className="container-page grid gap-16 py-20 lg:grid-cols-2">
        <div className="prose-lux">
          <h2>What we are</h2>
          <p>YAKI&apos;S LUXE HOMES is a property marketplace and referral platform. Our partners — developers, agencies and real-estate companies — provide authorised listings. We present them beautifully, review them before they go live, and introduce interested customers to the right partner.</p>
          <h2>What we are not</h2>
          <p>We are not the owner or seller of the properties you see, and we never ask customers to send property payments through us. Transactions happen directly between you and the partner, with your own legal advisers.</p>
          <h2>How we earn</h2>
          <p>When a transaction we referred completes, the partner pays us an agreed referral fee under our partnership agreement. You don&apos;t pay us to search, enquire or view.</p>
        </div>
        <div className="grid content-start gap-px bg-stone-200">
          {[["Trust", "Clear partner identity. Badges only for checks we've actually done."], ["Transparency", "Precise about our role, how we earn and what our verification covers."], ["Discretion", "Your details are shared with a partner only when you're introduced."], ["Nigerian excellence", "Built for Lagos, Abuja and the markets that come next — to an international standard."]].map(([t, d]) => (
            <div key={t} className="bg-ivory p-8"><h3 className="text-2xl">{t}</h3><p className="mt-2 text-sm text-stone-600">{d}</p></div>
          ))}
          <div className="bg-ivory p-8"><ButtonLink href="/properties">Explore properties</ButtonLink></div>
        </div>
      </div>
    </>
  );
}
