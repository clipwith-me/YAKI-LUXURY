"use client";

import { ActionForm, SubmitButton } from "./action-form";
import { Field, Input, Checkbox } from "@/components/ui/fields";
import { updateProfileAction } from "@/app/actions/account";

export function ProfileForm({ initial }: { initial: { name: string; email: string; phone: string; marketingOptIn: boolean } }) {
  return (
    <ActionForm action={updateProfileAction}>
      {({ fieldErrors: e }) => (
        <div className="space-y-5">
          <Field label="Full name" htmlFor="name" error={e.name}><Input id="name" name="name" defaultValue={initial.name} required /></Field>
          <Field label="Email" htmlFor="email" hint="Contact support to change your email."><Input id="email" defaultValue={initial.email} disabled /></Field>
          <Field label="Phone" htmlFor="phone" error={e.phone}><Input id="phone" name="phone" type="tel" defaultValue={initial.phone} /></Field>
          <Checkbox name="marketingOptIn" defaultChecked={initial.marketingOptIn} label="Send me market notes and new collections." />
          <SubmitButton>Save changes</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}
