import { PageTitle } from "@/components/dashboard/shell";
import { CompanyProfileForm } from "@/components/forms/company-profile-form";
import { requirePartnerPage } from "@/server/auth/guards";
import { db } from "@/server/db";

export default async function CompanyProfile() {
  const user = await requirePartnerPage();
  const p = await db.partner.findUniqueOrThrow({ where: { id: user.partnerId }, select: { companyName: true, slug: true, description: true, website: true, phone: true, officeAddress: true, areasServed: true, logoUrl: true, registrationNumber: true, status: true } });
  return (
    <>
      <PageTitle title="Company profile" description={p.status === "APPROVED" ? <>Public profile: <a href={`/partners/${p.slug}`} className="underline">/partners/{p.slug}</a></> : "Your public profile goes live once approved."} />
      <div className="max-w-2xl border border-stone-200 bg-white p-6"><CompanyProfileForm initial={{ ...p, areasServed: p.areasServed.join(", ") }} /></div>
    </>
  );
}
