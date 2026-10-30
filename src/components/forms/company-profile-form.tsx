"use client";

import { ActionForm, SubmitButton } from "./action-form";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { updateCompanyProfileAction } from "@/app/actions/partner";

export function CompanyProfileForm({ initial }: { initial: { companyName: string; description: string | null; website: string | null; phone: string; officeAddress: string; areasServed: string; logoUrl: string | null; registrationNumber: string | null } }) {
  return (
    <ActionForm action={updateCompanyProfileAction}>
      {({ fieldErrors: e }) => (
        <div className="space-y-5">
          <Field label="Company name" htmlFor="cn" hint="Contact our partner team to change your legal name or registration number."><Input id="cn" defaultValue={initial.companyName} disabled /></Field>
          <Field label="About" htmlFor="description" error={e.description}><Textarea id="description" name="description" rows={5} defaultValue={initial.description ?? ""} /></Field>
          <Field label="Website" htmlFor="website" error={e.website}><Input id="website" name="website" type="url" defaultValue={initial.website ?? ""} /></Field>
          <Field label="Logo URL" htmlFor="logoUrl" error={e.logoUrl}><Input id="logoUrl" name="logoUrl" type="url" defaultValue={initial.logoUrl ?? ""} /></Field>
          <Field label="Phone" htmlFor="phone" error={e.phone}><Input id="phone" name="phone" type="tel" defaultValue={initial.phone} /></Field>
          <Field label="Office address" htmlFor="officeAddress" error={e.officeAddress}><Input id="officeAddress" name="officeAddress" defaultValue={initial.officeAddress} /></Field>
          <Field label="Areas served" htmlFor="areasServed" hint="Comma-separated"><Input id="areasServed" name="areasServed" defaultValue={initial.areasServed} /></Field>
          <SubmitButton>Save profile</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}
