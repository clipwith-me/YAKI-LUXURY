import { PageTitle } from "@/components/dashboard/shell";
import { PropertyCard } from "@/components/property/property-card";
import { EmptyState, ButtonLink } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { favoriteIds, recentlyViewed } from "@/server/services/customers";

export default async function ViewedPage() {
  const user = await requireUser("/account/viewed");
  const [items, saved] = await Promise.all([recentlyViewed(toActor(user)), favoriteIds(user.id)]);
  return (
    <>
      <PageTitle title="Recently viewed" />
      {items.length === 0 ? <EmptyState title="Nothing viewed yet" description="Properties you open while signed in will appear here." action={<ButtonLink href="/properties">Browse properties</ButtonLink>} /> : <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{items.map((p) => <PropertyCard key={p.id} property={p} saved={saved.has(p.id)} signedIn />)}</div>}
    </>
  );
}
