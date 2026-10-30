import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="eyebrow mt-16">404</p>
      <h1 className="mt-3 text-5xl">This address isn&apos;t on our map</h1>
      <p className="mt-4 max-w-md text-stone-600">The page may have moved, or the listing may no longer be available.</p>
      <div className="mt-8 flex gap-3"><ButtonLink href="/properties">Browse properties</ButtonLink><ButtonLink href="/" variant="outline">Home</ButtonLink></div>
      <Link href="/contact" className="mt-6 text-sm underline">Speak with an advisor</Link>
    </main>
  );
}
