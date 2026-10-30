import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { SearchResults } from "@/components/property/search-results";

export const metadata: Metadata = { title: "Homes for Sale in Nigeria", description: "Houses, duplexes, apartments and villas for sale in Lagos, Abuja and across Nigeria.", alternates: { canonical: "/buy" } };

export default async function BuyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageHero crumbs={[{ label: "Buy" }]} eyebrow="Buy" title="Homes for sale" description="From family duplexes to waterfront villas — listed by developer and agency partners and reviewed by our team." />
      <SearchResults searchParams={await searchParams} preset={{ listingType: "SALE" }} basePath="/buy" />
    </>
  );
}
