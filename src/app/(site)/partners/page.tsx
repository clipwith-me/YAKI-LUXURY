import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { db } from "@/server/db";
import { publicPropertyWhere } from "@/server/services/properties";
import { activeBadgeWhere } from "@/server/services/verification";

export const metadata: Metadata = { title: "Our Property Partners", description: "Developers, agencies and real-estate companies listing on YAKI'S LUXE HOMES.", alternates: { canonical: "/partners" } };
export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const partners = await db.partner.findMany({
    where: { status: "APPROVED", deletedAt: null },
    select: { slug: true, companyName: true, type: true, description: true, areasServed: true, approvedAt: true, logoUrl: true, verifications: { where: activeBadgeWhere(), select: { category: true } }, _count: { select: { properties: { where: publicPropertyWhere() } } } },
    orderBy: { companyName: "asc" },
  });
  return (
    <>
      <PageHero crumbs={[{ label: "Partners" }]} eyebrow="Partners" title="The companies behind the listings" description="Every listing on YAKI'S LUXE HOMES is provided by an approved partner. Partner badges show only checks our team has actually completed." />
      <div className="container-page py-16">
        {partners.length === 0 ? (
          <EmptyState icon={<Icon.Building />} title="Partner profiles are on their way" description="We're onboarding our first partners." action={<ButtonLink href="/partner-with-us">Become a partner</ButtonLink>} />
        ) : (
          <div className="grid gap-px bg-stone-200 md:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <Link key={p.slug} href={`/partners/${p.slug}`} className="group flex flex-col bg-ivory p-8 transition hover:bg-white">
                <span className="flex h-14 w-14 items-center justify-center border border-stone-300 font-display text-2xl">{p.companyName.charAt(0)}</span>
                <h2 className="mt-6 text-2xl group-hover:underline">{p.companyName}</h2>
                <p className="mt-1 text-xs capitalize text-stone-500">{p.type.replace(/_/g, " ").toLowerCase()}{p.approvedAt && ` · Partner since ${p.approvedAt.getFullYear()}`}</p>
                {p.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-stone-600">{p.description}</p>}
                <div className="mt-auto flex items-center justify-between pt-6 text-xs text-stone-500">
                  <span>{p._count.properties} listings</span>
                  {p.verifications.some((v) => v.category === "PARTNER_VERIFIED") && <span className="flex items-center gap-1 text-trust"><Icon.Shield size={14} /> Verified Partner</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
