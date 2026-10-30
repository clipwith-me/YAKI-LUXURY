import { Logo } from "@/components/layout/logo";
import { PropertyImage } from "@/components/property/property-image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-ink lg:block">
        <PropertyImage src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80" alt="" sizes="50vw" priority className="opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute left-12 top-10"><Logo tone="ivory" /></div>
        <p className="absolute bottom-12 left-12 right-12 font-display text-4xl leading-tight text-ivory">Find a Home Worth Coming Home To.</p>
      </div>
      <main id="main" className="flex flex-col px-6 py-10 sm:px-12">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</div>
      </main>
    </div>
  );
}
