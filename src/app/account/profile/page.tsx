import { PageTitle } from "@/components/dashboard/shell";
import { ProfileForm } from "@/components/forms/profile-form";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, phone: true, customer: { select: { marketingOptIn: true } } } });
  return (
    <>
      <PageTitle title="Profile & preferences" />
      <div className="max-w-xl border border-stone-200 bg-white p-6"><ProfileForm initial={{ name: full.name, email: full.email, phone: full.phone ?? "", marketingOptIn: full.customer?.marketingOptIn ?? false }} /></div>
    </>
  );
}
