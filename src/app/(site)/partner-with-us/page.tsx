import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Partner With Us", description: "List your properties with YAKI'S LUXE HOMES. Reach serious buyers, receive qualified leads and track every referral.", alternates: { canonical: "/partner-with-us" } };

const BENEFITS = [
  [Icon.User, "Reach serious buyers", "Present your inventory to customers actively searching for premium homes in your areas."],
  [Icon.Building, "Showcase inventory", "Editorial listing pages with galleries, floor plans, video and development details."],
  [Icon.Bell, "Receive qualified leads", "Every enquiry becomes a lead with a reference; our advisors qualify and introduce clients."],
  [Icon.Flag, "Track referrals", "A transparent, timestamped record of where every client came from."],
  [Icon.Home, "Manage properties", "Add and update listings from your portal; we review before anything goes live."],
  [Icon.Calendar, "Track transactions", "Log viewings, offers and closings against each lead."],
  [Icon.Chart, "Access analytics", "See views, leads and conversions for your listings."],
] as const;

export default function PartnerWithUsPage() {
  return (
    <>
      <PageHero crumbs={[{ label: "Partner With Us" }]} eyebrow="For developers, agencies & real-estate companies" title="Become a Partner" description="We bring serious buyers. You bring exceptional property. Together we close with clarity." image="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=80">
        <ButtonLink href="/partner-with-us/apply" variant="brass" size="lg" className="mt-8">Apply to become a partner</ButtonLink>
      </PageHero>
      <div className="container-page py-20">
        <div className="grid gap-px bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(([I, t, d]) => (
            <div key={t} className="bg-ivory p-8"><I size={24} className="text-brass-600" /><h2 className="mt-5 text-2xl">{t}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{d}</p></div>
          ))}
          <div className="flex flex-col justify-center bg-ink p-8 text-ivory"><p className="font-display text-2xl">No listing fees at launch.</p><p className="mt-2 text-sm text-ivory/70">We earn an agreed referral fee only when a transaction we introduced completes.</p></div>
        </div>
        <div className="mt-20 grid gap-10 lg:grid-cols-2">
          <div className="prose-lux">
            <h2>What we look for</h2>
            <ul><li>Authority to market the properties you list</li><li>Accurate, up-to-date pricing and availability</li><li>Responsiveness to introduced clients</li><li>Willingness to share documentation for verification when requested</li></ul>
          </div>
          <div className="prose-lux">
            <h2>How commission works</h2>
            <p>Your agreement sets a percentage or fixed referral fee, the referral protection period and payment terms. When a deal closes, the system calculates the commission transparently — you&apos;ll see the same figures we do.</p>
            <p><Link href="/legal/referral-commission-terms">Referral & Commission Terms</Link> · <Link href="/legal/partner-terms">Partner Terms</Link></p>
          </div>
        </div>
        <div className="mt-16 text-center"><ButtonLink href="/partner-with-us/apply" size="lg">Apply to become a partner</ButtonLink></div>
      </div>
    </>
  );
}
