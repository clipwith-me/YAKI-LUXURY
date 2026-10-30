"use client";

import { ButtonLink, Button } from "@/components/ui/primitives";

// Never show stack traces or technical details to customers — only a digest they can quote to support.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-4xl">We couldn&apos;t load this page</h1>
      <p className="mt-3 max-w-md text-stone-600">Please try again. If it keeps happening, contact support{error.digest ? ` and quote reference ${error.digest}` : ""}.</p>
      <div className="mt-8 flex gap-3"><Button onClick={reset}>Try again</Button><ButtonLink href="/" variant="outline">Home</ButtonLink></div>
    </main>
  );
}
