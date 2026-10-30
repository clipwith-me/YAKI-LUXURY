import { PageTitle } from "@/components/dashboard/shell";
import { Notice } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { getLeadForStaff } from "@/server/services/leads";
import { evidenceHash } from "@/server/domain/attribution";
import { formatNaira } from "@/lib/money";
import { humanize } from "@/lib/labels";

/**
 * Printable attribution record: everything needed to show a customer originated through YAKI.
 * The stored evidence hash is recomputed to show the record hasn't been altered since capture.
 */
export default async function Evidence({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage("lead:read");
  const lead = await getLeadForStaff(toActor(user), (await params).id);
  const a = lead.attribution;
  const recomputed = a
    ? evidenceHash({ leadCode: lead.code, customerId: lead.customerId, propertyId: lead.propertyId, partnerId: lead.partnerId, agreementId: a.agreementId, createdAt: lead.createdAt.toISOString(), referralUrl: a.referralUrl, landingUrl: a.landingUrl, referrerUrl: a.referrerUrl, utmSource: a.utmSource, utmMedium: a.utmMedium, utmCampaign: a.utmCampaign, attributionWindowDays: a.attributionWindowDays, protectedUntil: a.protectedUntil.toISOString(), consentVersion: a.consentVersion })
    : null;
  const intact = a && recomputed === a.evidenceHash;
  const keyEvents = lead.events.filter((e) => ["CREATED", "PARTNER_NOTIFIED", "INTRODUCED_TO_PARTNER", "REPEAT_INQUIRY", "VIEWING_SCHEDULED", "VIEWING_COMPLETED", "OFFER_RECORDED", "DEAL_OPENED", "DEAL_CLOSED", "COMMISSION_CREATED", "COMMISSION_UPDATED"].includes(e.type));
  const row = (k: string, v: React.ReactNode) => <tr className="border-b border-stone-100"><th scope="row" className="w-56 py-2 pr-4 text-left font-normal text-stone-500">{k}</th><td className="py-2">{v ?? "—"}</td></tr>;
  return (
    <div className="max-w-4xl bg-white p-8 print:p-0">
      <PageTitle title={`Referral record — ${lead.code}`} description="YAKI'S LUXE HOMES lead attribution evidence" />
      {a ? <Notice tone={intact ? "trust" : "danger"} className="mb-6">{intact ? "Integrity check passed: the stored attribution record matches its original fingerprint." : "Integrity check FAILED: attribution data differs from its original fingerprint. Investigate before relying on this record."}</Notice> : <Notice tone="warning">No attribution record on this lead.</Notice>}
      <table className="w-full text-sm"><tbody>
        {row("Lead ID", <span className="font-mono">{lead.code}</span>)}
        {row("Enquiry received", lead.createdAt.toISOString())}
        {row("Client", `${lead.customer.fullName} (${lead.customer.email})`)}
        {row("Property", lead.property ? `${lead.property.title} — ${lead.property.reference}` : null)}
        {row("Partner", lead.partner?.companyName)}
        {row("Enquiry type / source", `${humanize(lead.type)} · ${humanize(lead.source)}`)}
        {row("Referral URL", a?.referralUrl)}
        {row("First touch", a?.firstTouchAt?.toISOString())}
        {row("Landing page", a?.landingUrl)}
        {row("External referrer", a?.referrerUrl)}
        {row("Campaign (UTM)", a ? [a.utmSource, a.utmMedium, a.utmCampaign].filter(Boolean).join(" / ") || null : null)}
        {row("Agreement", a?.agreement?.reference)}
        {row("Protection period", a ? `${a.attributionWindowDays} days — until ${a.protectedUntil.toISOString()}` : null)}
        {row("Introduced to partner", lead.introducedToPartnerAt?.toISOString())}
        {row("Consent text version", a?.consentVersion)}
        {row("Evidence fingerprint (SHA-256)", <span className="break-all font-mono text-xs">{a?.evidenceHash}</span>)}
        {lead.deal && row("Deal", `${humanize(lead.deal.status)} · ${formatNaira(lead.deal.agreedPriceKobo)}${lead.deal.closedAt ? ` · closed ${lead.deal.closedAt.toISOString()}` : ""}${lead.deal.withinAttributionWindow === false ? " · AFTER protection period" : lead.deal.withinAttributionWindow ? " · within protection period" : ""}`)}
        {lead.commission && row("Commission", `${formatNaira(lead.commission.actualKobo ?? lead.commission.expectedKobo)} · ${humanize(lead.commission.status)}`)}
      </tbody></table>
      <h2 className="mt-8 font-display text-2xl">Chronology</h2>
      <ol className="mt-3 space-y-1 text-sm">{keyEvents.map((e) => <li key={e.id}><span className="font-mono text-xs text-stone-500">{e.createdAt.toISOString()}</span> — {humanize(e.type)}{e.body && `: ${e.body}`}</li>)}</ol>
      <p className="mt-8 text-xs text-stone-500">Generated {new Date().toISOString()} by {user.name}. Use your browser&apos;s print function to save as PDF.</p>
    </div>
  );
}
