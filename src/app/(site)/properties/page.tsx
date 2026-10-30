import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { SearchResults } from "@/components/property/search-results";

export const metadata: Metadata = {
  title: "Properties for Sale and Rent in Nigeria",
  description: "Search homes for sale and rent in Lagos, Abuja and across Nigeria from trusted real-estate partners.",
  alternates: { canonical: "/properties" },
};

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageHero crumbs={[{ label: "Properties" }]} eyebrow="The marketplace" title="Properties across Nigeria" description="Filter by neighbourhood, budget, lifestyle and amenities — or describe what you're looking for." />
      <SearchResults searchParams={await searchParams} basePath="/properties" />
    </>
  );
}
