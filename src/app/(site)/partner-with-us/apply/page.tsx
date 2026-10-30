import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { PartnerApplicationForm } from "@/components/forms/partner-application-form";

export const metadata: Metadata = { title: "Apply to Become a Partner", alternates: { canonical: "/partner-with-us/apply" } };

export default function ApplyPage() {
  return (
    <>
      <PageHero crumbs={[{ label: "Partner With Us", href: "/partner-with-us" }, { label: "Apply" }]} eyebrow="Partner application" title="Tell us about your company" description="Applications are reviewed by our partner team, usually within a few business days. You'll create a login to track your status." />
      <div className="container-page max-w-4xl py-14"><PartnerApplicationForm /></div>
    </>
  );
}
