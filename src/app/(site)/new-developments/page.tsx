import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { SearchResults } from "@/components/property/search-results";
import { Notice } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "New Developments & Off-Plan Homes", description: "Off-plan and newly built homes from developer partners in Lagos and Abuja.", alternates: { canonical: "/new-developments" } };

export default async function NewDevelopmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageHero crumbs={[{ label: "New Developments" }]} eyebrow="New developments" title="Off-plan and newly built" description="Projects from our developer partners — from early-phase off-plan to newly completed homes." />
      <div className="container-page pt-8">
        <Notice tone="brass">Off-plan purchases carry specific risks (delays, specification changes). Payment plans are agreed directly with the developer — have your own lawyer review every contract.</Notice>
      </div>
      <SearchResults searchParams={await searchParams} preset={{ development: true }} basePath="/new-developments" />
    </>
  );
}
