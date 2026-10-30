"use client";

import Link from "next/link";
import { ActionForm, SubmitButton } from "./action-form";
import { Field, Input, Checkbox } from "@/components/ui/fields";
import { loginAction, registerAction } from "@/app/actions/public";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction} className="mt-8">
      {({ fieldErrors: e }) => (
        <div className="space-y-5">
          {next && <input type="hidden" name="next" value={next} />}
          <Field label="Email" htmlFor="email" error={e.email}><Input id="email" name="email" type="email" autoComplete="email" required autoFocus /></Field>
          <Field label="Password" htmlFor="password" error={e.password}><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
          <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">Sign in</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  return (
    <ActionForm action={registerAction} className="mt-8">
      {({ fieldErrors: e }) => (
        <div className="space-y-5">
          {next && <input type="hidden" name="next" value={next} />}
          <Field label="Full name" htmlFor="name" error={e.name} required><Input id="name" name="name" autoComplete="name" required /></Field>
          <Field label="Email" htmlFor="email" error={e.email} required><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Phone (optional)" htmlFor="phone" error={e.phone}><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" /></Field>
          <Field label="Password" htmlFor="password" error={e.password} hint="At least 10 characters, with a letter and a number" required><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
          <Checkbox name="marketingOptIn" label="Send me occasional market notes and new collections." />
          <SubmitButton className="w-full" size="lg" pendingLabel="Creating account…">Create account</SubmitButton>
          <p className="text-xs text-stone-500">By creating an account you agree to our <Link href="/legal/terms" className="underline">Terms</Link> and <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.</p>
        </div>
      )}
    </ActionForm>
  );
}
