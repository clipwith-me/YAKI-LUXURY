"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Thumb-reachable bottom navigation for phones. Hidden on property pages, which have their own sticky CTA. */
export function MobileNav({ advisorHref, accountHref }: { advisorHref: string; accountHref: string }) {
  const pathname = usePathname();
  if (/^\/properties\/[^/]+\/[^/]+\/[^/]+/.test(pathname)) return null;
  const items = [
    { href: "/", label: "Home", icon: Icon.Home },
    { href: "/properties", label: "Search", icon: Icon.Search },
    { href: "/account/saved", label: "Saved", icon: Icon.Heart },
    { href: advisorHref, label: "Advisor", icon: Icon.WhatsApp, external: advisorHref.startsWith("http") },
    { href: accountHref, label: "Account", icon: Icon.User },
  ];
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: I, external }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={label}>
              <Link href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-wide", active ? "text-ink" : "text-stone-500")}>
                <I size={20} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
