"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icons";
import { submitInquiry } from "@/app/actions/public";
import { cn } from "@/lib/cn";
import Link from "next/link";

const INTENTS = [
  { type: "VIEWING_REQUEST", label: "Request a viewing", short: "Viewing", icon: Icon.Calendar },
  { type: "INFORMATION_REQUEST", label: "Request more information", short: "Information", icon: Icon.Info },
  { type: "ADVISOR_CALLBACK", label: "Speak with an advisor", short: "Advisor", icon: Icon.Phone },
  { type: "PURCHASE_INTEREST", label: "Express purchase interest", short: "Interest", icon: Icon.Key },
] as const;

type Intent = (typeof INTENTS)[number]["type"];

/**
 * The conversion panel. One short form, four intents. Every submission becomes a Lead with an ID
 * the customer can quote, and the partner is notified without exposing the customer's details.
 */
export function InquiryPanel({ propertyId, propertyRef, title, advisorWhatsapp, defaults, isRental }: { propertyId?: string; propertyRef?: string; title?: string; advisorWhatsapp: string | null; defaults?: { name?: string; email?: string }; isRental?: boolean }) {
  const [intent, setIntent] = useState<Intent>(propertyId ? "VIEWING_REQUEST" : "ADVISOR_CALLBACK");
  const intents = propertyId ? INTENTS.filter((i) => !(isRental && i.type === "PURCHASE_INTEREST")) : INTENTS.filter((i) => i.type === "ADVISOR_CALLBACK");
  const waText = propertyRef ? `Hello YAKI'S LUXE HOMES, I'm interested in ${title} (ref ${propertyRef}).` : "Hello YAKI'S LUXE HOMES, I'd like to speak with an advisor.";
  return (
    <div className="border border-stone-200 bg-white p-6 shadow-soft">
      <p className="eyebrow">Interested in this property?</p>
      <h2 className="mt-2 text-2xl">{INTENTS.find((i) => i.type === intent)?.label}</h2>
      {intents.length > 1 && (
        <div role="tablist" aria-label="What would you like to do?" className="mt-5 grid grid-cols-2 gap-1.5">
          {intents.map(({ type, short, icon: I }) => (
            <button key={type} type="button" role="tab" aria-selected={intent === type} onClick={() => setIntent(type)} className={cn("flex items-center justify-center gap-1.5 border px-2 py-2.5 text-xs transition-colors", intent === type ? "border-ink bg-ink text-ivory" : "border-stone-200 text-stone-600 hover:border-stone-400")}>
              <I size={14} /> {short}
            </button>
          ))}
        </div>
      )}
      <ActionForm action={submitInquiry} className="mt-5">
        {({ fieldErrors, done }) =>
          done ? (
            <div className="py-4 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-trust-50 text-trust"><Icon.Check /></span>
              <p className="mt-4 text-sm text-stone-600">Track your enquiries any time in your account.</p>
              <Link href="/account/enquiries" className="mt-2 inline-block text-sm underline">View my enquiries</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
              <input type="hidden" name="type" value={intent} />
              {/* Honeypot: hidden from people, irresistible to bots. */}
              <div aria-hidden className="absolute -left-[9999px]"><label>Website<input name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
              <Field label="Full name" htmlFor="iq-name" error={fieldErrors.fullName} required>
                <Input id="iq-name" name="fullName" autoComplete="name" defaultValue={defaults?.name} invalid={!!fieldErrors.fullName} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Field label="Email" htmlFor="iq-email" error={fieldErrors.email} required>
                  <Input id="iq-email" name="email" type="email" autoComplete="email" defaultValue={defaults?.email} invalid={!!fieldErrors.email} required />
                </Field>
                <Field label="Phone" htmlFor="iq-phone" error={fieldErrors.phone} required>
                  <Input id="iq-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" invalid={!!fieldErrors.phone} required />
                </Field>
              </div>
              {intent === "VIEWING_REQUEST" && (
                <Field label="Preferred date (optional)" htmlFor="iq-date" error={fieldErrors.preferredViewingAt}>
                  <Input id="iq-date" name="preferredViewingAt" type="datetime-local" />
                </Field>
              )}
              <Field label="Preferred contact" htmlFor="iq-pref">
                <Select id="iq-pref" name="preferredContact" defaultValue="WHATSAPP">
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PHONE">Phone call</option>
                  <option value="EMAIL">Email</option>
                </Select>
              </Field>
              <Field label="Message (optional)" htmlFor="iq-msg" error={fieldErrors.message}>
                <Textarea id="iq-msg" name="message" rows={3} placeholder={intent === "PURCHASE_INTEREST" ? "Tell us about your budget and timing." : "Anything we should know?"} />
              </Field>
              <Checkbox name="consent" required label={<>I agree that YAKI&apos;S LUXE HOMES may contact me about this enquiry and share my details with the listing partner when introducing me. See our <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.</>} />
              {fieldErrors.consent && <p className="text-xs text-danger">{fieldErrors.consent[0]}</p>}
              <SubmitButton className="w-full" size="lg" pendingLabel="Sending…">Send request</SubmitButton>
            </div>
          )
        }
      </ActionForm>
      {advisorWhatsapp && (
        <a href={`https://wa.me/${advisorWhatsapp}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-11 w-full items-center justify-center gap-2 border border-stone-300 text-sm hover:border-ink">
          <Icon.WhatsApp /> {propertyRef ? "Request viewing on WhatsApp" : "Chat with an advisor"}
        </a>
      )}
      <p className="mt-4 text-[11px] leading-5 text-stone-500">YAKI&apos;S LUXE HOMES connects you with the listing partner. We never ask you to pay for a property through us.</p>
    </div>
  );
}
