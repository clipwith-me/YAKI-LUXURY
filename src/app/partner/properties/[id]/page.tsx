import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/dashboard/table";
import { PropertyForm } from "@/components/forms/property-form";
import { Notice } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { areaOptions, toFormValues } from "@/server/queries/forms";
import { archivePropertyAction } from "@/app/actions/partner";

export default async function EditProperty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requirePartnerPage();
  const { id } = await params;
  // Scoped lookup: another partner's id simply 404s.
  const p = await db.property.findFirst({ where: { id, partnerId: user.partnerId, deletedAt: null }, include: { amenities: { include: { amenity: true } }, images: true, location: { select: { path: true } } } });
  if (!p) notFound();
  const { saved } = await searchParams;
  return (
    <>
      <PageTitle title={p.title} description={<span className="flex items-center gap-2"><span className="font-mono">{p.reference}</span> <StatusBadge status={p.status} /></span>} action={p.status === "PUBLISHED" && <Link href={`/properties/${p.location.path}/${p.slug}`} className="text-sm underline">View live listing</Link>} />
      {saved && <Notice tone="trust" className="mb-6">Saved. {p.status === "PENDING_REVIEW" && "Our team will review it shortly."}</Notice>}
      {p.reviewNote && (p.status === "CHANGES_REQUESTED" || p.status === "REJECTED") && <Notice tone="warning" className="mb-6" title="Feedback from our review team">{p.reviewNote}</Notice>}
      {p.status === "PUBLISHED" && <Notice tone="neutral" className="mb-6">Editing a live listing sends it back for review. It stays hidden until re-approved.</Notice>}
      <PropertyForm values={toFormValues(p)} locations={await areaOptions()} />
      {p.status !== "ARCHIVED" && <form action={archivePropertyAction} className="mt-6"><input type="hidden" name="id" value={p.id} /><button className="text-sm text-danger underline">Archive this listing</button></form>}
    </>
  );
}
