import Link from "next/link";
import { Logo } from "./logo";
import { NewsletterForm } from "@/components/forms/newsletter-form";

const COLUMNS = [
  { title: "Discover", links: [["Buy", "/buy"], ["Rent", "/rent"], ["Luxury Collection", "/luxury"], ["New Developments", "/new-developments"], ["Locations", "/locations"], ["Compare", "/compare"]] },
  { title: "Company", links: [["About", "/about"], ["How It Works", "/how-it-works"], ["Our Partners", "/partners"], ["Real Estate Journal", "/journal"], ["Contact", "/contact"]] },
  { title: "Partners", links: [["Partner With Us", "/partner-with-us"], ["Apply", "/partner-with-us/apply"], ["Partner Sign In", "/login?next=/partner"], ["Partner Terms", "/legal/partner-terms"], ["Referral & Commission Terms", "/legal/referral-commission-terms"]] },
  { title: "Support", links: [["FAQ", "/faq"], ["Buyer Guide", "/buyer-guide"], ["Support", "/support"], ["Verification Policy", "/legal/verification-policy"], ["Complaints", "/legal/complaints"]] },
] as const;

const LEGAL = [
  ["Privacy", "/legal/privacy"],
  ["Terms", "/legal/terms"],
  ["Property Disclaimer", "/legal/property-disclaimer"],
  ["Cookies", "/legal/cookies"],
  ["Data Protection", "/legal/data-protection"],
  ["Refunds & Cancellations", "/legal/refunds-cancellations"],
] as const;

export function SiteFooter({ disclosure }: { disclosure: string }) {
  return (
    <footer className="bg-ink text-ivory/80">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Logo tone="ivory" />
          <p className="mt-6 text-sm leading-6 text-ivory/60">A premium real-estate marketplace connecting serious buyers with trusted property partners across Nigeria.</p>
          <div className="mt-8">
            <p className="eyebrow !text-brass-300">The Journal, in your inbox</p>
            <NewsletterForm tone="dark" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-brass-300">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-ivory/70 transition-colors hover:text-ivory">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-page flex flex-col gap-4 py-8 text-xs leading-5 text-ivory/50">
          <p className="max-w-4xl">{disclosure}</p>
          <div className="flex flex-col justify-between gap-4 md:flex-row">
            <p>© {new Date().getFullYear()} YAKI&apos;S LUXE HOMES. All rights reserved.</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-ivory">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
