import { PageTitle } from "@/components/dashboard/shell";
import { PropertyForm } from "@/components/forms/property-form";
import { Notice } from "@/components/ui/primitives";
import { requirePartnerPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { areaOptions } from "@/server/queries/forms";

export default async function NewProperty() {
  const user = await requirePartnerPage();
  const partner = await db.partner.findUniqueOrThrow({ where: { id: user.partnerId }, select: { status: true } });
  return (
    <>
      <PageTitle title="Add property" description="Listings are reviewed by our team before they appear on the website." />
      {partner.status !== "APPROVED" ? <Notice tone="warning">Your partner account must be approved before you can add properties.</Notice> : <PropertyForm locations={await areaOptions()} />}
    </>
  );
}
