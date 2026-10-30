import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Support", alternates: { canonical: "/support" } };

export default function SupportPage() {
  const items = [
    [Icon.Info, "FAQ", "Answers to common questions.", "/faq"],
    [Icon.Phone, "Contact an advisor", "Questions about a property or enquiry.", "/contact"],
    [Icon.Building, "Partner support", "Sign in to your partner portal.", "/login?next=/partner"],
    [Icon.Flag, "Report a concern", "Something doesn't look right? Tell us.", "/legal/complaints"],
    [Icon.Shield, "Verification policy", "What our badges mean.", "/legal/verification-policy"],
    [Icon.User, "Your account", "Saved homes, alerts and enquiries.", "/account"],
  ] as const;
  return (
    <>
      <PageHero crumbs={[{ label: "Support" }]} eyebrow="Support" title="How can we help?" />
      <div className="container-page grid gap-px bg-stone-200 py-0 sm:grid-cols-2 lg:grid-cols-3 my-14">
        {items.map(([I, t, d, href]) => (
          <Link key={t} href={href} className="group bg-ivory p-8 hover:bg-white"><I size={24} className="text-brass-600" /><h2 className="mt-5 text-2xl group-hover:underline">{t}</h2><p className="mt-1 text-sm text-stone-600">{d}</p></Link>
        ))}
      </div>
    </>
  );
}
