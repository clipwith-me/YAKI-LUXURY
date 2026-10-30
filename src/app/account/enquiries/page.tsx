import Link from "next/link";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/dashboard/table";
import { EmptyState, ButtonLink } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { myLeads } from "@/server/services/customers";
import { humanize } from "@/lib/labels";

// Customers see a simplified status — never internal notes, partner terms or commission.
function customerStatus(s: string): string {
  if (["NEW", "CONTACTED", "QUALIFIED"].includes(s)) return "In progress";
  if (s.startsWith("VIEWING")) return humanize(s);
  if (["OFFER_MADE", "NEGOTIATION", "CONTRACT_SIGNED"].includes(s)) return "In negotiation";
  if (["CLOSED", "COMMISSION_PENDING", "COMMISSION_DUE", "COMMISSION_PAID"].includes(s)) return "Completed";
  return s === "LOST" ? "Closed" : "In progress";
}

export default async function EnquiriesPage() {
  const user = await requireUser("/account/enquiries");
  const leads = await myLeads(toActor(user));
  return (
    <>
      <PageTitle title="Enquiries & viewings" description="Quote your reference when you speak with us." />
      {leads.length === 0 ? (
        <EmptyState title="No enquiries yet" description="When you request a viewing or information, it will appear here with its reference." action={<ButtonLink href="/properties">Find a property</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} id={l.code} className="border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-stone-500">{l.code}</p>
                  <p className="mt-1 font-medium">{l.property ? <Link href={`/properties/${l.property.location.path}/${l.property.slug}`} className="hover:underline">{l.property.title}</Link> : "General enquiry"}</p>
                  <p className="mt-1 text-xs text-stone-500">{humanize(l.type)} · {l.createdAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
                </div>
                <span className="text-sm text-stone-700">{customerStatus(l.status)}</span>
              </div>
              {l.viewings.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-stone-100 pt-3 text-sm">
                  {l.viewings.map((v) => <li key={v.id} className="flex items-center gap-3"><StatusBadge status={v.status} /> {v.scheduledAt ? v.scheduledAt.toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short" }) : "Date to be confirmed"} · {humanize(v.mode)}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
