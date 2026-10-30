import Link from "next/link";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/cn";

export type Crumb = { label: string; href?: string };

/** Visible breadcrumbs + BreadcrumbList structured data for search engines. */
export function Breadcrumbs({ items, tone = "ink" }: { items: Crumb[]; tone?: "ink" | "ivory" }) {
  const all = [{ label: "Home", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: absoluteUrl(c.href) } : {}) })),
  };
  return (
    <nav aria-label="Breadcrumb">
      <ol className={cn("flex flex-wrap items-center gap-1.5 text-xs", tone === "ivory" ? "text-ivory/60" : "text-stone-500")}>
        {all.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {c.href && i < all.length - 1 ? <Link href={c.href} className="hover:underline">{c.label}</Link> : <span aria-current={i === all.length - 1 ? "page" : undefined}>{c.label}</span>}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
