import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { publicPropertyWhere } from "@/server/services/properties";
import { LEGAL_DOCS } from "@/content/legal";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Dynamic sitemap: static pages, locations, live (non-demo) listings, partners and journal. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (p: string) => `${site.url}${p}`;
  const [properties, locations, partners, articles] = await Promise.all([
    db.property.findMany({ where: { ...publicPropertyWhere(), isDemo: false }, select: { slug: true, updatedAt: true, location: { select: { path: true } } }, take: 45000 }),
    db.location.findMany({ where: { isActive: true }, select: { path: true, updatedAt: true } }),
    db.partner.findMany({ where: { status: "APPROVED", isDemo: false }, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { status: "PUBLISHED", isDemo: false }, select: { slug: true, updatedAt: true } }),
  ]);
  const statics = ["/", "/properties", "/buy", "/rent", "/luxury", "/new-developments", "/locations", "/partners", "/journal", "/about", "/how-it-works", "/partner-with-us", "/contact", "/faq", "/buyer-guide", "/support", ...Object.keys(LEGAL_DOCS).map((s) => `/legal/${s}`)];
  return [
    ...statics.map((p) => ({ url: u(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...locations.flatMap((l) => [{ url: u(`/locations/${l.path}`), lastModified: l.updatedAt }, { url: u(`/properties/${l.path}`), lastModified: l.updatedAt }]),
    ...properties.map((p) => ({ url: u(`/properties/${p.location.path}/${p.slug}`), lastModified: p.updatedAt, priority: 0.8 })),
    ...partners.map((p) => ({ url: u(`/partners/${p.slug}`), lastModified: p.updatedAt })),
    ...articles.map((a) => ({ url: u(`/journal/${a.slug}`), lastModified: a.updatedAt })),
  ];
}
