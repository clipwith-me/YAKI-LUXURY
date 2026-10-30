import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getSessionUser } from "@/server/auth/session";
import { getAllSettings } from "@/server/settings";
import { db } from "@/server/db";
import { whatsappNumber } from "@/lib/phone";

function homeFor(role: string) {
  return role === "PARTNER" ? "/partner" : role === "CUSTOMER" ? "/account" : "/admin";
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings, demoCount] = await Promise.all([getSessionUser(), getAllSettings(), db.property.count({ where: { isDemo: true, status: "PUBLISHED" } })]);
  const advisor = settings["contact.advisorWhatsapp"];
  const advisorHref = advisor ? `https://wa.me/${whatsappNumber(advisor)}?text=${encodeURIComponent("Hello YAKI'S LUXE HOMES, I'd like to speak with an advisor.")}` : "/contact";
  const showDemo = settings["features.showDemoBanner"] && demoCount > 0;
  return (
    <>
      {showDemo && (
        <div className="fixed inset-x-0 bottom-[60px] z-40 bg-brass-600 px-4 py-1.5 text-center text-[11px] tracking-wide text-white md:bottom-0">
          DEMO DATA — listings, partners and articles marked “Demo” are fictional and shown for demonstration only. <Link href="/legal/property-disclaimer" className="underline">Learn more</Link>
        </div>
      )}
      <SiteHeader user={user ? { name: user.name, home: homeFor(user.role) } : null} />
      <main id="main" className="min-h-[60vh] pb-20 md:pb-0">{children}</main>
      <SiteFooter disclosure={settings["legal.entityDisclosure"]} />
      <MobileNav advisorHref={advisorHref} accountHref={user ? homeFor(user.role) : "/login"} />
    </>
  );
}
