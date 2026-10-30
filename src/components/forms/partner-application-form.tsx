"use client";

import Link from "next/link";
import { ActionForm, SubmitButton } from "./action-form";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/fields";
import { applyPartnerAction } from "@/app/actions/public";

const CATEGORIES = ["Residential sales", "Residential rentals", "Luxury homes", "Off-plan / new developments", "Serviced apartments", "Land", "Commercial"];

export function PartnerApplicationForm() {
  return (
    <ActionForm action={applyPartnerAction}>
      {({ fieldErrors: e }) => (
        <div className="space-y-10">
          <div aria-hidden className="absolute -left-[9999px]"><input name="company_website" tabIndex={-1} autoComplete="off" /></div>
          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="mb-4 font-display text-2xl">Company</legend>
            <Field label="Company name" htmlFor="companyName" error={e.companyName} required className="sm:col-span-2"><Input id="companyName" name="companyName" autoComplete="organization" required /></Field>
            <Field label="Company type" htmlFor="type" error={e.type} required>
              <Select id="type" name="type" defaultValue="DEVELOPER"><option value="DEVELOPER">Property developer</option><option value="REAL_ESTATE_COMPANY">Real-estate company</option><option value="AGENCY">Estate agency</option><option value="PROPERTY_MARKETER">Property marketer</option><option value="PROPERTY_OWNER">Property owner</option></Select>
            </Field>
            <Field label="Company registration number" htmlFor="registrationNumber" error={e.registrationNumber} hint="e.g. your CAC RC or BN number"><Input id="registrationNumber" name="registrationNumber" /></Field>
            <Field label="Office address" htmlFor="officeAddress" error={e.officeAddress} required className="sm:col-span-2"><Input id="officeAddress" name="officeAddress" autoComplete="street-address" required /></Field>
            <Field label="City" htmlFor="city" error={e.city} required><Input id="city" name="city" required /></Field>
            <Field label="State" htmlFor="state" error={e.state} required><Input id="state" name="state" required /></Field>
            <Field label="Website" htmlFor="website" error={e.website}><Input id="website" name="website" type="url" placeholder="https://" /></Field>
            <Field label="Professional / licence information" htmlFor="licenseInfo" error={e.licenseInfo} hint="Memberships or licences, where applicable"><Input id="licenseInfo" name="licenseInfo" /></Field>
            <Field label="About your company" htmlFor="description" error={e.description} className="sm:col-span-2"><Textarea id="description" name="description" rows={4} /></Field>
            <Field label="Areas served" htmlFor="areasServed" error={e.areasServed} hint="Comma-separated, e.g. Lekki, Ikoyi, Maitama" className="sm:col-span-2"><Input id="areasServed" name="areasServed" /></Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-[13px] font-medium text-stone-700">Property categories</legend>
              <div className="grid gap-2 sm:grid-cols-3">{CATEGORIES.map((c) => <Checkbox key={c} name="propertyCategories[]" value={c} label={c} />)}</div>
            </fieldset>
          </fieldset>
          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="mb-4 font-display text-2xl">Primary contact & login</legend>
            <Field label="Full name" htmlFor="contactName" error={e.contactName} required><Input id="contactName" name="contactName" autoComplete="name" required /></Field>
            <Field label="Phone" htmlFor="phone" error={e.phone} required><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" required /></Field>
            <Field label="Email" htmlFor="email" error={e.email} required><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
            <Field label="Password" htmlFor="password" error={e.password} hint="At least 10 characters, with a letter and a number" required><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
          </fieldset>
          <div className="space-y-3 border-t border-stone-200 pt-6">
            <p className="text-sm text-stone-600">You&apos;ll be able to upload registration and authority documents from your partner portal after applying. Commission terms are agreed individually with our partner team.</p>
            <Checkbox name="acceptTerms" label={<>I confirm the information is accurate and I accept the <Link href="/legal/partner-terms" className="underline" target="_blank">Partner Terms</Link>.</>} />
            {e.acceptTerms && <p className="text-xs text-danger">{e.acceptTerms[0]}</p>}
            <SubmitButton size="lg" pendingLabel="Submitting…">Submit application</SubmitButton>
          </div>
        </div>
      )}
    </ActionForm>
  );
}
