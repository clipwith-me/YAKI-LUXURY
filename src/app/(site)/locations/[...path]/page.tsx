import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-hero";
import { SearchResults } from "@/components/property/search-results";
import { db } from "@/server/db";

type Props = { params: Promise<{ path: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const load = (path: string[]) => (path.length > 2 ? null : db.location.findFirst({ where: { path: path.join("/"), isActive: true }, include: { parent: true } }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loc = await load((await params).path);
  if (!loc) return { title: "Location not found" };
  return { title: `Living in ${loc.name}${loc.parent ? `, ${loc.parent.name}` : ""} — Homes for Sale & Rent`, description: loc.description ?? undefined, alternates: { canonical: `/locations/${loc.path}` } };
}

export default async function LocationPage({ params, searchParams }: Props) {
  const loc = await load((await params).path);
  if (!loc) notFound();
  const crumbs = [{ label: "Locations", href: "/locations" }, ...(loc.parent ? [{ label: loc.parent.name, href: `/locations/${loc.parent.path}` }] : []), { label: loc.name }];
  return (
    <>
      <PageHero crumbs={crumbs} eyebrow={loc.parent?.name ?? "Nigeria"} title={loc.name} description={loc.description ?? undefined} image={loc.heroImage} />
      <SearchResults searchParams={await searchParams} preset={{ location: loc.path }} basePath={`/locations/${loc.path}`} />
    </>
  );
}
