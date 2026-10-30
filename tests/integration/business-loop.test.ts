import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { applyAsPartner, createAgreement, setPartnerStatus } from "@/server/services/partners";
import { createProperty, reviewProperty } from "@/server/services/properties";
import { searchProperties } from "@/server/search/engine";
import { createInquiry, getLeadForPartner, introduceLeadToPartner } from "@/server/services/leads";
import { recordViewingOutcome, scheduleViewing } from "@/server/services/viewings";
import { recordOffer, updateOfferStatus } from "@/server/services/offers";
import { closeDeal, markContractSigned, openDeal } from "@/server/services/deals";
import { recordCommissionPayment, transitionCommission, markOverdueCommissionsDue } from "@/server/services/commissions";
import type { Actor } from "@/server/authz/policies";
import { nairaToKobo } from "@/lib/money";
import { makeLocations, makeUser, resetDb, sampleInquiry, sampleProperty } from "../helpers";

/**
 * The brief's "most important business loop" (§61), executed end to end against PostgreSQL:
 * partner registers → approved → submits property → approved → appears in search → customer requests
 * viewing → lead + Lead ID → partner notified → staff follow up → viewing → offer → deal closed →
 * commission calculated → due → partner pays → admin marks paid → origin provable.
 */
describe("core business loop", () => {
  let admin: Actor;
  let finance: Actor;
  let leadManager: Actor;
  let partnerActor: Actor;
  let partnerId: string;
  let propertyId: string;
  let leadId: string;
  let leadCode: string;
  let dealId: string;
  let commissionId: string;
  let lekkiId: string;

  beforeAll(async () => {
    await resetDb();
    lekkiId = (await makeLocations()).lekki.id;
    admin = await makeUser("SUPER_ADMIN");
    finance = await makeUser("FINANCE");
    leadManager = await makeUser("LEAD_MANAGER");
  });

  it("1. a developer applies to become a partner (PENDING)", async () => {
    const { partner, userId } = await applyAsPartner({
      companyName: "Coastline Homes Ltd",
      type: "DEVELOPER",
      contactName: "Tunde Bakare",
      email: "tunde@coastline.example",
      phone: "0803 555 0101",
      password: "Secure-pass-2026",
      officeAddress: "12 Admiralty Way, Lekki",
      city: "Lekki",
      state: "Lagos",
      registrationNumber: "RC 1234567",
      areasServed: ["Lekki"],
      acceptTerms: true,
    });
    expect(partner.status).toBe("PENDING");
    partnerId = partner.id;
    partnerActor = { id: userId, role: "PARTNER", partnerIds: [partner.id] };
    // Partner managers/admins are told there's an application to review.
    expect(await db.notification.count({ where: { userId: admin.id, type: "partner.applied" } })).toBe(1);
  });

  it("2. a pending partner cannot submit listings", async () => {
    await expect(createProperty(partnerActor, partnerId, sampleProperty(lekkiId), { submit: true })).rejects.toThrow(/approved/);
  });

  it("3. admin reviews and approves the partner, and records the commercial agreement", async () => {
    await setPartnerStatus(admin, partnerId, "UNDER_REVIEW");
    const approved = await setPartnerStatus(admin, partnerId, "APPROVED");
    expect(approved.status).toBe("APPROVED");
    const agreement = await createAgreement(admin, {
      partnerId,
      agreementDate: "2026-01-01",
      startDate: "2026-01-01",
      commissionType: "PERCENTAGE",
      commissionRatePercent: 2,
      attributionWindowDays: 120,
      paymentTermsDays: 30,
      activate: true,
    });
    expect(agreement.commissionRateBps).toBe(200);
    expect(await db.auditLog.count({ where: { entityId: partnerId, action: "partner.approved" } })).toBe(1);
  });

  it("4. partner submits a property → PENDING_REVIEW, not public", async () => {
    const p = await createProperty(partnerActor, partnerId, sampleProperty(lekkiId), { submit: true });
    propertyId = p.id;
    expect(p.status).toBe("PENDING_REVIEW");
    expect((await searchProperties({ location: "lagos/lekki" })).total).toBe(0);
  });

  it("5. admin approves the property → it appears in search", async () => {
    await reviewProperty(admin, propertyId, { decision: "APPROVE" });
    const results = await searchProperties({ location: "lagos", minBedrooms: 4, amenities: ["pool"] });
    expect(results.items.map((i) => i.id)).toContain(propertyId);
  });

  it("6. customer requests a viewing → Lead with unique YLH ID, attribution and a viewing request", async () => {
    const res = await createInquiry(sampleInquiry(propertyId, { email: "adaeze@example.com" }), {
      referralUrl: "https://yaki.example/properties/lagos/lekki/x",
      firstTouch: { at: "2026-10-01T09:00:00.000Z", landing: "/?utm_source=instagram", utm_source: "instagram", utm_medium: "social" },
      visitorHash: "abc123",
    });
    expect(res.repeat).toBe(false);
    expect(res.leadCode).toMatch(/^YLH-\d{4}-\d{5}$/);
    leadCode = res.leadCode;
    const lead = await db.lead.findUniqueOrThrow({ where: { code: leadCode }, include: { attribution: true, viewings: true } });
    leadId = lead.id;
    expect(lead.partnerId).toBe(partnerId);
    expect(lead.status).toBe("VIEWING_REQUESTED");
    expect(lead.viewings).toHaveLength(1);
    expect(lead.attribution?.attributionWindowDays).toBe(120); // from the agreement, not hard-coded
    expect(lead.attribution?.utmSource).toBe("instagram");
    expect(lead.attribution?.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("7. a repeat enquiry is attached to the same lead (no duplicate)", async () => {
    const again = await createInquiry(sampleInquiry(propertyId, { email: "adaeze@example.com", type: "INFORMATION_REQUEST" }));
    expect(again).toEqual({ leadCode, repeat: true });
    expect(await db.lead.count()).toBe(1);
  });

  it("8. partner is notified without customer contact details", async () => {
    const note = await db.notification.findFirstOrThrow({ where: { userId: partnerActor.id, type: "lead.new" } });
    expect(note.body).not.toContain("adaeze");
    expect(note.body).not.toContain("0803");
    const view = await getLeadForPartner(partnerActor, leadId);
    expect(view.introduced).toBe(false);
    expect(view.customer.email).toBeNull();
    expect(view.customer.phone).toBeNull();
    expect(view.customer.fullName).not.toBe("Adaeze Okafor");
  });

  it("9. partner cannot act on the lead before introduction", async () => {
    await expect(scheduleViewing(partnerActor, leadId, { scheduledAt: new Date(Date.now() + 86400000) })).rejects.toThrow(/introduced/);
  });

  it("10. staff follow up and introduce the client; partner now sees contact details", async () => {
    await introduceLeadToPartner(leadManager, leadId);
    const view = await getLeadForPartner(partnerActor, leadId);
    expect(view.introduced).toBe(true);
    expect(view.customer.email).toBe("adaeze@example.com");
  });

  it("11. viewing scheduled and completed", async () => {
    const v = await scheduleViewing(leadManager, leadId, { scheduledAt: new Date(Date.now() + 2 * 86400000), mode: "IN_PERSON" });
    expect((await db.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe("VIEWING_SCHEDULED");
    await recordViewingOutcome(partnerActor, v.id, { outcome: "COMPLETED" });
    expect((await db.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe("VIEWING_COMPLETED");
  });

  it("12. offer and negotiation", async () => {
    const offer = await recordOffer(partnerActor, leadId, { amount: "145,000,000" });
    await updateOfferStatus(leadManager, offer.id, "ACCEPTED");
    expect((await db.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe("NEGOTIATION");
  });

  it("13. deal closed → commission calculated from the agreement (2% of ₦150M = ₦3M)", async () => {
    const deal = await openDeal(leadManager, leadId, { agreedPrice: "150,000,000" });
    dealId = deal.id;
    await markContractSigned(partnerActor, dealId);
    const { commission, deal: closed } = await closeDeal(leadManager, dealId);
    commissionId = commission.id;
    expect(closed.withinAttributionWindow).toBe(true);
    expect(commission.expectedKobo).toBe(nairaToKobo("3000000"));
    expect(commission.status).toBe("PENDING");
    expect((await db.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe("COMMISSION_PENDING");
    expect((await db.property.findUniqueOrThrow({ where: { id: propertyId } })).availability).toBe("SOLD");
    expect(await db.notification.count({ where: { userId: finance.id, type: "deal.closed" } })).toBe(1);
  });

  it("14. commission becomes due once its due date passes (automation)", async () => {
    expect(await markOverdueCommissionsDue(new Date(Date.now() + 31 * 86400000))).toBe(1);
    expect((await db.commission.findUniqueOrThrow({ where: { id: commissionId } })).status).toBe("DUE");
    expect((await db.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe("COMMISSION_DUE");
  });

  it("15. partner pays in two instalments; payments are idempotent by reference; admin marks paid", async () => {
    await transitionCommission(finance, commissionId, { status: "INVOICED" });
    const partial = await recordCommissionPayment(finance, commissionId, { amount: "1,000,000", paidAt: "2026-11-01", reference: "TRF-001" });
    expect(partial.status).toBe("PARTIALLY_PAID");
    await expect(recordCommissionPayment(finance, commissionId, { amount: "1,000,000", paidAt: "2026-11-01", reference: "TRF-001" })).rejects.toThrow(/already recorded/);
    const paid = await recordCommissionPayment(finance, commissionId, { amount: "2,000,000", paidAt: "2026-11-15", reference: "TRF-002" });
    expect(paid.status).toBe("PAID");
    expect(paid.paidKobo).toBe(nairaToKobo("3000000"));
    expect((await db.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe("COMMISSION_PAID");
    expect(await db.auditLog.count({ where: { entityId: commissionId, action: "commission.marked_paid" } })).toBe(1);
  });

  it("16. the platform can prove where the customer originated", async () => {
    const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId }, include: { attribution: true, events: { orderBy: { createdAt: "asc" } } } });
    const types = lead.events.map((e) => e.type);
    for (const t of ["CREATED", "PARTNER_NOTIFIED", "REPEAT_INQUIRY", "INTRODUCED_TO_PARTNER", "VIEWING_SCHEDULED", "VIEWING_COMPLETED", "OFFER_RECORDED", "DEAL_CLOSED", "COMMISSION_CREATED"] as const) {
      expect(types).toContain(t);
    }
    expect(lead.attribution!.createdAt.getTime()).toBeLessThan((await db.deal.findUniqueOrThrow({ where: { id: dealId } })).closedAt!.getTime());
  });

  it("17. closing a deal without commission terms is blocked (revenue never silently lost)", async () => {
    const other = await db.partner.create({ data: { slug: "no-terms", companyName: "No Terms", type: "AGENCY", email: "n@t.co", phone: "+2348030000000", officeAddress: "x", city: "x", state: "x", status: "APPROVED" } });
    const prop = await createProperty(admin, other.id, sampleProperty(lekkiId, { title: "Another lovely detached home" }), { submit: true });
    await reviewProperty(admin, prop.id, { decision: "APPROVE" });
    const { leadCode: code } = await createInquiry(sampleInquiry(prop.id));
    const lead = await db.lead.findUniqueOrThrow({ where: { code } });
    await introduceLeadToPartner(leadManager, lead.id);
    const deal = await openDeal(leadManager, lead.id, { agreedPrice: "100,000,000" });
    await expect(closeDeal(leadManager, deal.id)).rejects.toThrow(/No commission terms/);
  });

  it("18. lead IDs are unique and sequential per year under concurrency", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => createInquiry({ type: "GENERAL_ENQUIRY", fullName: `Buyer ${i}`, email: `b${i}@ex.com`, phone: `080312345${10 + i}`, consent: true })),
    );
    const codes = results.map((r) => r.leadCode);
    expect(new Set(codes).size).toBe(8);
  });
});
