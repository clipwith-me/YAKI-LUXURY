import type { ReactNode } from "react";
import { PropertyImage } from "@/components/property/property-image";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/** Editorial page header. With an image it becomes a dark cinematic band; without, a quiet ivory masthead. */
export function PageHero({ eyebrow, title, description, image, crumbs, children }: { eyebrow?: string; title: ReactNode; description?: ReactNode; image?: string | null; crumbs?: Crumb[]; children?: ReactNode }) {
  if (image) {
    return (
      <section className="relative flex min-h-[52vh] items-end overflow-hidden bg-ink pb-14 pt-36 text-ivory">
        <PropertyImage src={image} alt="" sizes="100vw" priority className="opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="container-page relative">
          {crumbs && <Breadcrumbs items={crumbs} tone="ivory" />}
          {eyebrow && <p className="eyebrow mt-6 !text-brass-300">{eyebrow}</p>}
          <h1 className="mt-3 max-w-4xl text-5xl leading-[1.05] sm:text-6xl">{title}</h1>
          {description && <p className="mt-5 max-w-2xl text-base leading-7 text-ivory/75">{description}</p>}
          {children}
        </div>
      </section>
    );
  }
  return (
    <section className="border-b border-stone-200 bg-stone-50 pb-12 pt-32">
      <div className="container-page">
        {crumbs && <Breadcrumbs items={crumbs} />}
        {eyebrow && <p className="eyebrow mt-6">{eyebrow}</p>}
        <h1 className="mt-3 max-w-4xl text-4xl leading-[1.08] sm:text-[3.4rem]">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-[15px] leading-7 text-stone-600">{description}</p>}
        {children}
      </div>
    </section>
  );
}
