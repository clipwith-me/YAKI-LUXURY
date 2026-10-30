import { PageTitle } from "@/components/dashboard/shell";
import { PropertyCard } from "@/components/property/property-card";
import { CompareTray } from "@/components/property/property-actions";
import { EmptyState, ButtonLink } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { requireUser } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { listFavorites } from "@/server/services/customers";

export default async function SavedPage() {
  const user = await requireUser("/account/saved");
  const items = await listFavorites(toActor(user));
  return (
    <>
      <PageTitle title="Saved properties" />
      {items.length === 0 ? (
        <EmptyState icon={<Icon.Heart />} title="No saved properties yet" description="Start exploring homes you'll love." action={<ButtonLink href="/properties">Explore properties</ButtonLink>} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{items.map((p) => <PropertyCard key={p.id} property={p} saved signedIn />)}</div>
      )}
      <CompareTray />
    </>
  );
}
