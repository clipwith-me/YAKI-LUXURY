import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { SearchResults } from "@/components/property/search-results";

export const metadata: Metadata = { title: "Homes for Rent in Nigeria", description: "Serviced apartments, furnished homes and family houses to rent in Lagos, Abuja and across Nigeria.", alternates: { canonical: "/rent" } };

export default async function RentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageHero crumbs={[{ label: "Rent" }]} eyebrow="Rent" title="Homes to rent" description="Serviced, furnished and family homes. Annual rents are shown as quoted by the listing partner." />
      <SearchResults searchParams={await searchParams} preset={{ listingType: "RENT" }} basePath="/rent" />
    </>
  );
}
