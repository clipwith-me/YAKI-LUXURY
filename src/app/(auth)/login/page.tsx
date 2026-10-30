import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-3 text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-stone-600">Customers, partners and staff sign in here.</p>
      <LoginForm next={next} />
      <p className="mt-8 text-sm text-stone-600">New to YAKI? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">Create an account</Link> · <Link href="/partner-with-us/apply" className="underline">Apply as a partner</Link></p>
      <p className="mt-2 text-xs text-stone-500">Forgotten your password? Contact support — self-service reset is coming soon.</p>
    </>
  );
}
