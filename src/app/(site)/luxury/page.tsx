import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { SearchResults } from "@/components/property/search-results";

export const metadata: Metadata = { title: "The Luxury Collection", description: "Exceptional luxury homes, villas and penthouses in Banana Island, Ikoyi, Lekki, Maitama and Asokoro.", alternates: { canonical: "/luxury" } };

export default async function LuxuryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageHero crumbs={[{ label: "Luxury Collection" }]} eyebrow="The Luxury Collection" title="Residences of rare distinction" description="A curated collection of Nigeria's most exceptional homes, presented with discretion." image="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=2400&q=80" />
      <SearchResults searchParams={await searchParams} preset={{ luxury: true }} basePath="/luxury" />
    </>
  );
}
