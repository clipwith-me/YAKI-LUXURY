"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { Icon } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/buy", label: "Buy" },
  { href: "/rent", label: "Rent" },
  { href: "/luxury", label: "Luxury Collection" },
  { href: "/new-developments", label: "New Developments" },
  { href: "/locations", label: "Locations" },
  { href: "/partners", label: "Partners" },
  { href: "/journal", label: "Journal" },
];

export function SiteHeader({ user }: { user: { name: string; home: string } | null }) {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const transparent = overHero && !scrolled && !open;
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-colors duration-300", transparent ? "bg-transparent" : "border-b border-stone-200/80 bg-ivory/95 backdrop-blur")}>
      <div className="container-page flex h-[72px] items-center justify-between gap-6">
        <Logo tone={transparent ? "ivory" : "ink"} />
        <nav aria-label="Main" className="hidden items-center gap-7 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[13px] tracking-wide transition-colors",
                transparent ? "text-ivory/85 hover:text-ivory" : "text-stone-600 hover:text-ink",
                pathname.startsWith(item.href) && (transparent ? "text-ivory" : "text-ink"),
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={user ? "/account/saved" : "/login?next=/account/saved"} aria-label="Saved properties" className={cn("hidden h-10 w-10 items-center justify-center sm:flex", transparent ? "text-ivory" : "text-ink")}>
            <Icon.Heart />
          </Link>
          {user ? (
            <Link href={user.home} className={cn("hidden items-center gap-2 px-3 text-[13px] sm:flex", transparent ? "text-ivory" : "text-ink")}>
              <Icon.User /> {user.name.split(" ")[0]}
            </Link>
          ) : (
            <Link href="/login" className={cn("hidden px-3 text-[13px] sm:block", transparent ? "text-ivory" : "text-ink")}>
              Sign in
            </Link>
          )}
          <Link href="/partner-with-us" className={cn(buttonClasses(transparent ? "outline" : "primary", "sm"), "hidden md:inline-flex", transparent && "border-ivory/70 text-ivory hover:bg-ivory hover:text-ink")}>
            Partner with us
          </Link>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} className={cn("flex h-10 w-10 items-center justify-center xl:hidden", transparent ? "text-ivory" : "text-ink")}>
            {open ? <Icon.Close size={22} /> : <Icon.Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-[72px] bottom-0 overflow-y-auto bg-ivory xl:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col py-6">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between border-b border-stone-200 py-4 font-display text-2xl">
                {item.label} <Icon.Chevron className="text-stone-400" />
              </Link>
            ))}
            <div className="mt-8 grid gap-3">
              <Link href="/partner-with-us" className={buttonClasses("primary", "md")}>Partner with us</Link>
              <Link href={user ? user.home : "/login"} className={buttonClasses("secondary", "md")}>{user ? "My account" : "Sign in"}</Link>
              <Link href="/contact" className={buttonClasses("ghost", "md")}>Contact an advisor</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
