import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <p className="eyebrow">Free account</p>
      <h1 className="mt-3 text-4xl">Create your account</h1>
      <p className="mt-2 text-sm text-stone-600">Save homes, create alerts and track your enquiries and viewings.</p>
      <RegisterForm next={next} />
      <p className="mt-8 text-sm text-stone-600">Already have an account? <Link href="/login" className="underline">Sign in</Link></p>
    </>
  );
}
