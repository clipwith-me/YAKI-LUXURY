import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { InquiryPanel } from "@/components/property/inquiry-panel";
import { getAllSettings } from "@/server/settings";
import { getSessionUser } from "@/server/auth/session";
import { whatsappNumber, formatNigerianPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Contact an Advisor", description: "Speak with a YAKI'S LUXE HOMES advisor about buying, renting or partnering.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const [s, user] = await Promise.all([getAllSettings(), getSessionUser()]);
  const wa = s["contact.advisorWhatsapp"];
  return (
    <>
      <PageHero crumbs={[{ label: "Contact" }]} eyebrow="Contact" title="Speak with an advisor" description="Tell us what you're looking for. An advisor will respond, usually within one business day." />
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_420px]">
        <div className="prose-lux">
          <h2>How we can help</h2>
          <ul><li>Shortlisting homes that match your brief</li><li>Arranging viewings across several neighbourhoods</li><li>Introductions to developer and agency partners</li><li>Partnership enquiries</li></ul>
          <h2>Direct contact</h2>
          <p>{s["contact.supportEmail"] ? <>Email: <a href={`mailto:${s["contact.supportEmail"]}`}>{s["contact.supportEmail"]}</a></> : "Use the form and an advisor will get back to you."}</p>
          {s["contact.supportPhone"] && <p>Phone: {s["contact.supportPhone"]}</p>}
          {wa && <p>WhatsApp: <a href={`https://wa.me/${whatsappNumber(wa)}`} target="_blank" rel="noopener noreferrer">{formatNigerianPhone(wa)}</a></p>}
        </div>
        <InquiryPanel advisorWhatsapp={wa ? whatsappNumber(wa) : null} defaults={user ? { name: user.name, email: user.email } : undefined} />
      </div>
    </>
  );
}
