"use client";

import { SimpleActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/fields";
import * as A from "@/app/actions/admin";

const Hidden = ({ id, returnTo }: { id: string; returnTo: string }) => (<><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={returnTo} /></>);

export function PropertyReviewForm({ id, returnTo }: { id: string; returnTo: string }) {
  return (
    <SimpleActionForm action={A.reviewPropertyAction}>
      <Hidden id={id} returnTo={returnTo} />
      <Field label="Note to partner (required to reject or request changes)" htmlFor="note"><Textarea id="note" name="note" rows={3} /></Field>
      <div className="mt-3 flex flex-wrap gap-2">
        <SubmitButton name="decision" value="APPROVE">Approve & publish</SubmitButton>
        <SubmitButton name="decision" value="REQUEST_CHANGES" variant="outline">Request changes</SubmitButton>
        <SubmitButton name="decision" value="REJECT" variant="danger">Reject</SubmitButton>
      </div>
    </SimpleActionForm>
  );
}

export function ListingControlsForm({ id, returnTo, v, canCommission }: { id: string; returnTo: string; canCommission: boolean; v: { featured: boolean; isLuxury: boolean; showExactAddress: boolean; availability: string; commissionType: string | null; commissionRatePercent: string; fixedFeeNaira: string; listingExpiresAt: string } }) {
  return (
    <SimpleActionForm action={A.listingControlsAction}>
      <Hidden id={id} returnTo={returnTo} />
      <div className="grid gap-2">
        <Checkbox name="featured" defaultChecked={v.featured} label="Featured on homepage" />
        <Checkbox name="isLuxury" defaultChecked={v.isLuxury} label="Luxury Collection" />
        <Checkbox name="showExactAddress" defaultChecked={v.showExactAddress} label="Show exact address (also requires the global setting)" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Availability" htmlFor="availability"><Select id="availability" name="availability" defaultValue={v.availability}>{["AVAILABLE", "UNDER_OFFER", "SOLD", "LET", "OFF_MARKET"].map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}</Select></Field>
        <Field label="Listing expires" htmlFor="listingExpiresAt"><Input id="listingExpiresAt" name="listingExpiresAt" type="date" defaultValue={v.listingExpiresAt} /></Field>
        {canCommission && (
          <>
            <Field label="Commission override" htmlFor="commissionType"><Select id="commissionType" name="commissionType" defaultValue={v.commissionType ?? ""}><option value="">Use partner agreement</option><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed fee</option></Select></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Rate %" htmlFor="commissionRatePercent"><Input id="commissionRatePercent" name="commissionRatePercent" inputMode="decimal" defaultValue={v.commissionRatePercent} /></Field>
              <Field label="Fixed ₦" htmlFor="fixedFeeNaira"><Input id="fixedFeeNaira" name="fixedFeeNaira" inputMode="decimal" defaultValue={v.fixedFeeNaira} /></Field>
            </div>
          </>
        )}
      </div>
      <SubmitButton className="mt-4" size="sm">Save controls</SubmitButton>
    </SimpleActionForm>
  );
}

export function VerificationForm({ subjectType, subjectId, returnTo }: { subjectType: "PROPERTY" | "PARTNER"; subjectId: string; returnTo: string }) {
  const cats = subjectType === "PROPERTY" ? [["LISTING_VERIFIED", "Listing verified"], ["INSPECTION_COMPLETED", "Inspection completed"], ["DOCUMENTATION_REVIEWED", "Documentation reviewed"]] : [["PARTNER_VERIFIED", "Partner verified"], ["FEATURED_PARTNER", "Featured partner"]];
  return (
    <SimpleActionForm action={A.createVerificationAction} resetOnSuccess>
      <input type="hidden" name="subjectType" value={subjectType} /><input type="hidden" name="subjectId" value={subjectId} /><input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category" htmlFor="category"><Select id="category" name="category">{cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Status" htmlFor="vstatus"><Select id="vstatus" name="status"><option value="PENDING">Pending (in progress)</option><option value="ACTIVE">Completed — show badge</option></Select></Field>
        <Field label="Review / expiry date" htmlFor="reviewDueAt"><Input id="reviewDueAt" name="reviewDueAt" type="date" /></Field>
        <Field label="Public scope note" htmlFor="publicNote"><Input id="publicNote" name="publicNote" placeholder="What exactly was checked" /></Field>
        <Field label="Internal notes & evidence" htmlFor="internalNotes" className="sm:col-span-2"><Textarea id="internalNotes" name="internalNotes" rows={2} /></Field>
      </div>
      <p className="mt-2 text-xs text-stone-500">Only record a completed check you performed or reviewed. Badges never imply title or legal verification.</p>
      <SubmitButton className="mt-3" size="sm">Record verification</SubmitButton>
    </SimpleActionForm>
  );
}

export function FlagForm({ subjectType, subjectId, returnTo }: { subjectType: string; subjectId: string; returnTo: string }) {
  return (
    <SimpleActionForm action={A.raiseFlagAction} resetOnSuccess>
      <input type="hidden" name="subjectType" value={subjectType} /><input type="hidden" name="subjectId" value={subjectId} /><input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex gap-2"><Input name="details" placeholder="What looks wrong?" aria-label="Flag details" required /><SubmitButton size="sm" variant="outline" className="h-11">Flag</SubmitButton></div>
    </SimpleActionForm>
  );
}

const PARTNER_NEXT: Record<string, string[]> = { PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED"], UNDER_REVIEW: ["APPROVED", "REJECTED", "PENDING"], APPROVED: ["SUSPENDED"], SUSPENDED: ["APPROVED", "REJECTED"], REJECTED: ["UNDER_REVIEW"] };

const PARTNER_ACTION_LABEL: Record<string, string> = { UNDER_REVIEW: "Start review", APPROVED: "Approve partner", REJECTED: "Reject", SUSPENDED: "Suspend", PENDING: "Return to pending" };

export function PartnerStatusForm({ id, returnTo, current }: { id: string; returnTo: string; current: string }) {
  return (
    <SimpleActionForm action={A.partnerStatusAction}>
      <Hidden id={id} returnTo={returnTo} />
      <Field label="Reason (required to reject or suspend; shared with partner)" htmlFor="reason"><Input id="reason" name="reason" /></Field>
      <div className="mt-3 flex flex-wrap gap-2">
        {(PARTNER_NEXT[current] ?? []).map((s) => (
          <SubmitButton key={s} name="status" value={s} size="sm" variant={s === "APPROVED" ? "primary" : s === "REJECTED" || s === "SUSPENDED" ? "danger" : "outline"}>
            {PARTNER_ACTION_LABEL[s] ?? s}
          </SubmitButton>
        ))}
      </div>
    </SimpleActionForm>
  );
}

export function NotesForm({ id, returnTo, notes }: { id: string; returnTo: string; notes: string }) {
  return (
    <SimpleActionForm action={A.partnerNotesAction}>
      <Hidden id={id} returnTo={returnTo} />
      <Textarea name="notes" rows={4} defaultValue={notes} aria-label="Internal notes" />
      <SubmitButton size="sm" variant="outline" className="mt-2">Save notes</SubmitButton>
    </SimpleActionForm>
  );
}

export function AgreementForm({ partnerId, returnTo, windowOptions, defaultWindow }: { partnerId: string; returnTo: string; windowOptions: number[]; defaultWindow: number }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <SimpleActionForm action={A.createAgreementAction}>
      <input type="hidden" name="partnerId" value={partnerId} /><input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Agreement date" htmlFor="agreementDate"><Input id="agreementDate" name="agreementDate" type="date" defaultValue={today} /></Field>
        <Field label="Start" htmlFor="startDate"><Input id="startDate" name="startDate" type="date" defaultValue={today} /></Field>
        <Field label="End (optional)" htmlFor="endDate"><Input id="endDate" name="endDate" type="date" /></Field>
        <Field label="Commission type" htmlFor="commissionType"><Select id="commissionType" name="commissionType"><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed fee</option></Select></Field>
        <Field label="Rate %" htmlFor="commissionRatePercent"><Input id="commissionRatePercent" name="commissionRatePercent" inputMode="decimal" placeholder="2" /></Field>
        <Field label="Fixed fee ₦" htmlFor="fixedFeeNaira"><Input id="fixedFeeNaira" name="fixedFeeNaira" inputMode="decimal" /></Field>
        <Field label="Referral protection (days)" htmlFor="attributionWindowDays" hint={`Common: ${windowOptions.join(", ")}`}>
          <Input id="attributionWindowDays" name="attributionWindowDays" type="number" min={1} defaultValue={defaultWindow} list="window-options" />
          <datalist id="window-options">{windowOptions.map((w) => <option key={w} value={w} />)}</datalist>
        </Field>
        <Field label="Payment terms (days)" htmlFor="paymentTermsDays"><Input id="paymentTermsDays" name="paymentTermsDays" type="number" min={0} defaultValue={30} /></Field>
        <Field label="Eligible properties" htmlFor="scope"><Select id="scope" name="scope"><option value="ALL_PROPERTIES">All properties</option><option value="SELECTED_PROPERTIES">Selected properties</option></Select></Field>
        <Field label="Cancellation rules" htmlFor="cancellationRules" className="sm:col-span-3"><Textarea id="cancellationRules" name="cancellationRules" rows={2} /></Field>
        <Field label="Special conditions" htmlFor="specialConditions" className="sm:col-span-3"><Textarea id="specialConditions" name="specialConditions" rows={2} /></Field>
      </div>
      <Checkbox name="activate" defaultChecked label="Activate now (replaces the current active agreement)" className="mt-3" />
      <SubmitButton size="sm" className="mt-3">Save agreement</SubmitButton>
    </SimpleActionForm>
  );
}

export function LeadStatusForm({ id, returnTo, current, statuses }: { id: string; returnTo: string; current: string; statuses: string[] }) {
  return (
    <SimpleActionForm action={A.leadStatusAction}>
      <Hidden id={id} returnTo={returnTo} />
      <div className="flex flex-wrap gap-2">
        <Select name="status" defaultValue={statuses.includes(current) ? current : statuses[0]} aria-label="Lead status" className="!w-auto">{statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}</Select>
        <Input name="note" placeholder="Reason / note (required for Lost)" aria-label="Status note" className="!w-64" />
        <SubmitButton size="sm" className="h-11">Update</SubmitButton>
      </div>
    </SimpleActionForm>
  );
}

export function CommissionForms({ id, returnTo, status, canManage }: { id: string; returnTo: string; status: string; canManage: boolean }) {
  if (!canManage || status === "PAID" || status === "WAIVED") return null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <div className="border border-stone-200 bg-white p-5">
        <h3 className="mb-3 font-display text-xl">Record payment from partner</h3>
        <SimpleActionForm action={A.commissionPaymentAction} resetOnSuccess>
          <Hidden id={id} returnTo={returnTo} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount received (₦)" htmlFor="amount"><Input id="amount" name="amount" inputMode="decimal" required /></Field>
            <Field label="Date received" htmlFor="paidAt"><Input id="paidAt" name="paidAt" type="date" defaultValue={today} required /></Field>
            <Field label="Method" htmlFor="method"><Select id="method" name="method"><option value="BANK_TRANSFER">Bank transfer</option><option value="CHEQUE">Cheque</option><option value="OTHER">Other</option></Select></Field>
            <Field label="Bank reference" htmlFor="reference"><Input id="reference" name="reference" required /></Field>
          </div>
          <SubmitButton size="sm" className="mt-3">Record payment</SubmitButton>
        </SimpleActionForm>
      </div>
      <div className="border border-stone-200 bg-white p-5">
        <h3 className="mb-3 font-display text-xl">Status</h3>
        <SimpleActionForm action={A.commissionTransitionAction}>
          <Hidden id={id} returnTo={returnTo} />
          <Input name="reason" placeholder="Reason (required for dispute / waive)" aria-label="Reason" />
          <div className="mt-3 flex flex-wrap gap-2">
            {status === "PENDING" && <SubmitButton size="sm" variant="outline" name="status" value="DUE">Mark due</SubmitButton>}
            {["PENDING", "DUE", "DISPUTED"].includes(status) && <SubmitButton size="sm" variant="outline" name="status" value="INVOICED">Mark invoiced</SubmitButton>}
            {status !== "DISPUTED" && <SubmitButton size="sm" variant="outline" name="status" value="DISPUTED">Dispute</SubmitButton>}
            <SubmitButton size="sm" variant="danger" name="status" value="WAIVED">Waive</SubmitButton>
          </div>
        </SimpleActionForm>
      </div>
      <div className="border border-stone-200 bg-white p-5">
        <h3 className="mb-3 font-display text-xl">Adjust amount</h3>
        <SimpleActionForm action={A.commissionAdjustAction}>
          <Hidden id={id} returnTo={returnTo} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Actual commission (₦)" htmlFor="actualAmount"><Input id="actualAmount" name="actualAmount" inputMode="decimal" required /></Field>
            <Field label="Reason" htmlFor="reason2"><Input id="reason2" name="reason" required /></Field>
          </div>
          <SubmitButton size="sm" variant="outline" className="mt-3">Save adjustment</SubmitButton>
        </SimpleActionForm>
      </div>
    </div>
  );
}

export function StaffForm({ roles, returnTo }: { roles: string[]; returnTo: string }) {
  return (
    <SimpleActionForm action={A.createStaffAction} resetOnSuccess>
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Name" htmlFor="sname"><Input id="sname" name="name" required /></Field>
        <Field label="Email" htmlFor="semail"><Input id="semail" name="email" type="email" required /></Field>
        <Field label="Temporary password" htmlFor="spass"><Input id="spass" name="password" type="password" autoComplete="new-password" required /></Field>
        <Field label="Role" htmlFor="srole"><Select id="srole" name="role">{roles.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ").toLowerCase()}</option>)}</Select></Field>
      </div>
      <SubmitButton size="sm" className="mt-3">Create staff account</SubmitButton>
    </SimpleActionForm>
  );
}

export function SettingsForm({ values }: { values: Record<string, unknown> }) {
  const s = (k: string) => (values[k] === null || values[k] === undefined ? "" : Array.isArray(values[k]) ? (values[k] as number[]).join(", ") : String(values[k]));
  const b = (k: string) => values[k] === true;
  return (
    <SimpleActionForm action={A.saveSettingsAction}>
      <div className="space-y-8">
        <fieldset className="grid gap-4 border border-stone-200 bg-white p-6 sm:grid-cols-2">
          <legend className="px-2 font-display text-xl">Attribution & commission</legend>
          <Field label="Default referral protection (days)" htmlFor="adw" hint="Used when a partner has no active agreement"><Input id="adw" name="attribution.defaultWindowDays" type="number" defaultValue={s("attribution.defaultWindowDays")} /></Field>
          <Field label="Window options offered (days)" htmlFor="awo"><Input id="awo" name="attribution.windowOptions" defaultValue={s("attribution.windowOptions")} /></Field>
          <Field label="Default commission payment terms (days)" htmlFor="cpt"><Input id="cpt" name="commission.defaultPaymentTermsDays" type="number" defaultValue={s("commission.defaultPaymentTermsDays")} /></Field>
          <Field label="Repeated-phone risk threshold (24h)" htmlFor="rpt"><Input id="rpt" name="risk.repeatedPhoneThreshold24h" type="number" defaultValue={s("risk.repeatedPhoneThreshold24h")} /></Field>
        </fieldset>
        <fieldset className="grid gap-4 border border-stone-200 bg-white p-6 sm:grid-cols-2">
          <legend className="px-2 font-display text-xl">Contact</legend>
          <Field label="Advisor WhatsApp (+234…)" htmlFor="wa" hint="Enables WhatsApp buttons site-wide"><Input id="wa" name="contact.advisorWhatsapp" defaultValue={s("contact.advisorWhatsapp")} placeholder="+2348031234567" /></Field>
          <Field label="Support email" htmlFor="se"><Input id="se" name="contact.supportEmail" type="email" defaultValue={s("contact.supportEmail")} /></Field>
          <Field label="Support phone" htmlFor="sp"><Input id="sp" name="contact.supportPhone" defaultValue={s("contact.supportPhone")} /></Field>
        </fieldset>
        <fieldset className="grid gap-4 border border-stone-200 bg-white p-6">
          <legend className="px-2 font-display text-xl">Legal & compliance (configure after professional review)</legend>
          <Field label="Entity disclosure (footer)" htmlFor="ed"><Textarea id="ed" name="legal.entityDisclosure" rows={3} defaultValue={s("legal.entityDisclosure")} /></Field>
          <Checkbox name="legal.reviewedByCounsel" defaultChecked={b("legal.reviewedByCounsel")} label="Legal pages have been reviewed by counsel (removes the draft notice)" />
          <Checkbox name="features.publicReviews" defaultChecked={b("features.publicReviews")} label="Allow customer reviews (moderated)" />
          <Checkbox name="features.showExactAddresses" defaultChecked={b("features.showExactAddresses")} label="Allow exact addresses on listings where staff enable it" />
          <Checkbox name="features.whatsappBusinessApi" defaultChecked={b("features.whatsappBusinessApi")} label="WhatsApp Business API notifications (requires provider credentials)" />
          <Checkbox name="features.onlinePayments" defaultChecked={b("features.onlinePayments")} label="Online payments (not implemented — requires legal, financial and provider review)" />
          <Checkbox name="features.showDemoBanner" defaultChecked={b("features.showDemoBanner")} label="Show the DEMO DATA banner while demo content exists" />
        </fieldset>
        <SubmitButton>Save settings</SubmitButton>
      </div>
    </SimpleActionForm>
  );
}
