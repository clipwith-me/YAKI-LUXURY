import { PageTitle } from "@/components/dashboard/shell";
import { PropertyForm } from "@/components/forms/property-form";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { areaOptions } from "@/server/queries/forms";

export default async function AdminNewProperty() {
  await requireStaffPage("property:edit");
  const partners = await db.partner.findMany({ where: { status: "APPROVED" }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } });
  return (
    <>
      <PageTitle title="Add property for a partner" description="Use when a partner sends listing details offline. It still goes through review." />
      <PropertyForm locations={await areaOptions()} partners={partners.map((p) => ({ id: p.id, name: p.companyName }))} />
    </>
  );
}
