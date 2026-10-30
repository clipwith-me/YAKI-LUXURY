"use client";

import { ActionForm, SubmitButton } from "./action-form";
import { subscribeNewsletter } from "@/app/actions/public";
import { cn } from "@/lib/cn";

export function NewsletterForm({ tone = "light", source = "footer" }: { tone?: "light" | "dark"; source?: string }) {
  return (
    <ActionForm action={subscribeNewsletter} resetOnSuccess className="mt-3">
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="source" value={source} />
          <div className="flex gap-2">
            <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
            <input
              id={`nl-${source}`}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Your email address"
              className={cn("h-11 w-full min-w-0 border px-3.5 text-sm focus:outline-none", tone === "dark" ? "border-ivory/20 bg-transparent text-ivory placeholder:text-ivory/40 focus:border-ivory/60" : "border-stone-300 bg-white text-ink focus:border-ink")}
            />
            <SubmitButton variant={tone === "dark" ? "brass" : "primary"} pendingLabel="…">Subscribe</SubmitButton>
          </div>
          {fieldErrors.email && <p className="mt-1 text-xs text-danger">{fieldErrors.email[0]}</p>}
          <p className={cn("mt-2 text-[11px]", tone === "dark" ? "text-ivory/40" : "text-stone-500")}>Occasional market notes and new collections. Unsubscribe anytime.</p>
        </>
      )}
    </ActionForm>
  );
}
