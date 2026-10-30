"use client";

import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/fields";
import { scheduleViewingAction, viewingOutcomeAction, recordOfferAction, offerStatusAction, openDealAction, dealStageAction, leadNoteAction } from "@/app/actions/partner";

type Viewing = { id: string; status: string; scheduledAt: string | null; mode: string };
type Offer = { id: string; status: string; amount: string };
type Deal = { id: string; status: string; agreedPrice: string } | null;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="border border-stone-200 bg-white p-5"><h3 className="mb-4 font-display text-xl">{title}</h3>{children}</div>;
}

/** Viewing → offer → deal actions. Rendered for staff and for partners once a lead is introduced. */
export function LeadWorkflow({ leadId, returnTo, viewings, offers, deal, staff }: { leadId: string; returnTo: string; viewings: Viewing[]; offers: Offer[]; deal: Deal; staff: boolean }) {
  const hidden = (<><input type="hidden" name="leadId" value={leadId} /><input type="hidden" name="returnTo" value={returnTo} /></>);
  const openViewings = viewings.filter((v) => v.status === "REQUESTED" || v.status === "SCHEDULED");
  return (
    <div className="space-y-4">
      <Card title="Viewings">
        {openViewings.map((v) => (
          <ActionForm key={v.id} action={viewingOutcomeAction} className="mb-4 border-b border-stone-100 pb-4">
            {() => (
              <div className="space-y-2">
                <input type="hidden" name="viewingId" value={v.id} /><input type="hidden" name="returnTo" value={returnTo} />
                <p className="text-sm">{v.status === "SCHEDULED" ? `Scheduled ${v.scheduledAt ? new Date(v.scheduledAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : ""}` : "Requested by client"}</p>
                <div className="flex flex-wrap gap-2">
                  <Select name="outcome" className="!w-auto !py-1.5 text-sm" defaultValue="COMPLETED"><option value="COMPLETED">Completed</option><option value="NO_SHOW">No-show</option><option value="CANCELLED">Cancelled</option></Select>
                  <SubmitButton size="sm" variant="outline">Record outcome</SubmitButton>
                </div>
              </div>
            )}
          </ActionForm>
        ))}
        <ActionForm action={scheduleViewingAction}>
          {({ fieldErrors: e }) => (
            <div className="grid gap-3 sm:grid-cols-2">
              {hidden}
              <Field label="Date & time" htmlFor="scheduledAt" error={e.scheduledAt}><Input id="scheduledAt" name="scheduledAt" type="datetime-local" required /></Field>
              <Field label="Mode" htmlFor="mode"><Select id="mode" name="mode"><option value="IN_PERSON">In person</option><option value="VIRTUAL">Virtual</option></Select></Field>
              <Field label="Notes" htmlFor="vnotes" className="sm:col-span-2"><Input id="vnotes" name="notes" /></Field>
              <SubmitButton size="sm">{openViewings.length ? "Reschedule / confirm" : "Schedule viewing"}</SubmitButton>
            </div>
          )}
        </ActionForm>
      </Card>

      <Card title="Offers">
        {offers.length > 0 && (
          <ul className="mb-4 space-y-2 text-sm">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{o.amount} · <span className="text-stone-500">{o.status.toLowerCase()}</span></span>
                {(o.status === "SUBMITTED" || o.status === "COUNTERED") && (
                  <form action={offerStatusAction} className="flex gap-1">
                    <input type="hidden" name="offerId" value={o.id} /><input type="hidden" name="returnTo" value={returnTo} />
                    {["ACCEPTED", "COUNTERED", "REJECTED", "WITHDRAWN"].map((s) => <button key={s} name="status" value={s} className="border border-stone-300 px-2 py-1 text-[11px] hover:border-ink">{s.toLowerCase()}</button>)}
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={recordOfferAction} resetOnSuccess>
          {({ fieldErrors: e }) => (
            <div className="flex flex-wrap items-end gap-2">
              {hidden}
              <Field label="Offer amount (₦)" htmlFor="amount" error={e.amount} className="flex-1"><Input id="amount" name="amount" inputMode="decimal" placeholder="145,000,000" /></Field>
              <SubmitButton size="sm" className="h-11">Record offer</SubmitButton>
            </div>
          )}
        </ActionForm>
      </Card>

      <Card title="Deal">
        {!deal ? (
          <ActionForm action={openDealAction}>
            {({ fieldErrors: e }) => (
              <div className="flex flex-wrap items-end gap-2">
                {hidden}
                <Field label="Agreed price (₦)" htmlFor="agreedPrice" error={e.agreedPrice} className="flex-1"><Input id="agreedPrice" name="agreedPrice" inputMode="decimal" /></Field>
                <SubmitButton size="sm" className="h-11">Open deal</SubmitButton>
              </div>
            )}
          </ActionForm>
        ) : deal.status === "IN_PROGRESS" || deal.status === "CONTRACT_SIGNED" ? (
          <ActionForm action={dealStageAction}>
            {() => (
              <div className="space-y-3">
                <input type="hidden" name="dealId" value={deal.id} /><input type="hidden" name="returnTo" value={returnTo} />
                <p className="text-sm">Agreed price {deal.agreedPrice} · <span className="text-stone-500">{deal.status.replace("_", " ").toLowerCase()}</span></p>
                {deal.status === "IN_PROGRESS" && <SubmitButton size="sm" variant="outline" name="stage" value="SIGNED">Mark contract signed</SubmitButton>}
                <div className="grid gap-2 border-t border-stone-100 pt-3 sm:grid-cols-2">
                  <Field label="Final price (₦, if different)" htmlFor="finalPrice"><Input id="finalPrice" name="finalPrice" inputMode="decimal" /></Field>
                  <Field label="Completion date" htmlFor="closedAt"><Input id="closedAt" name="closedAt" type="date" /></Field>
                </div>
                <SubmitButton size="sm" name="stage" value="CLOSE" pendingLabel="Closing…">Mark deal closed</SubmitButton>
                <p className="text-xs text-stone-500">Closing calculates the referral commission from the partnership agreement.</p>
              </div>
            )}
          </ActionForm>
        ) : (
          <p className="text-sm">Deal {deal.status.toLowerCase()} at {deal.agreedPrice}.</p>
        )}
      </Card>

      <Card title={staff ? "Note or contact log" : "Update for YAKI"}>
        <ActionForm action={leadNoteAction} resetOnSuccess>
          {({ fieldErrors: e }) => (
            <div className="space-y-3">
              {hidden}
              {staff && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Select name="kind" aria-label="Entry type"><option value="NOTE">Internal note</option><option value="CONTACT_LOGGED">Contact log</option></Select>
                  <Select name="channel" aria-label="Channel"><option value="">Channel…</option><option value="PHONE">Phone</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="MEETING">Meeting</option></Select>
                  <Input name="nextFollowUpAt" type="datetime-local" aria-label="Next follow-up" />
                </div>
              )}
              <Textarea name="body" rows={3} required aria-label="Note" />
              {e.body && <p className="text-xs text-danger">{e.body[0]}</p>}
              {staff && <Checkbox name="partnerVisible" label="Share with partner" />}
              <SubmitButton size="sm">Save</SubmitButton>
            </div>
          )}
        </ActionForm>
      </Card>
    </div>
  );
}
