import { ButtonLink } from "@/components/ui/primitives";

export default function Forbidden() {
  return (
    <>
      <p className="eyebrow">Access</p>
      <h1 className="mt-3 text-4xl">This area isn&apos;t available to your account</h1>
      <p className="mt-3 text-sm text-stone-600">If you believe you should have access, contact your administrator.</p>
      <div className="mt-8 flex gap-3"><ButtonLink href="/">Go home</ButtonLink><ButtonLink href="/login" variant="outline">Switch account</ButtonLink></div>
    </>
  );
}
