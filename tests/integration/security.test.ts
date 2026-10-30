import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import type { Actor } from "@/server/authz/policies";
import { createProperty, reviewProperty, updateProperty, publicPropertyWhere } from "@/server/services/properties";
import { createInquiry, getLeadForPartner, getLeadForStaff, listLeadsForPartner, updateLeadStatus, addLeadNote, introduceLeadToPartner } from "@/server/services/leads";
import { setPartnerStatus, createAgreement } from "@/server/services/partners";
import { recordCommissionPayment, listCommissionsForPartner } from "@/server/services/commissions";
import { createVerification } from "@/server/services/verification";
import { updateSetting } from "@/server/settings";
import { searchProperties } from "@/server/search/engine";
import { makeLocations, makePartner, makeUser, resetDb, sampleInquiry, sampleProperty } from "../helpers";

describe("authorization & tenant isolation", () => {
  let admin: Actor;
  let a: { partner: { id: string }; actor: Actor };
  let b: { partner: { id: string }; actor: Actor };
  let customer: Actor;
  let leadA: string;
  let propertyA: string;
  let lekki: string;

  beforeAll(async () => {
    await resetDb();
    lekki = (await makeLocations()).lekki.id;
    admin = await makeUser("SUPER_ADMIN");
    customer = await makeUser("CUSTOMER");
    a = await makePartner("APPROVED", "Alpha");
    b = await makePartner("APPROVED", "Bravo");
    const p = await createProperty(a.actor, a.partner.id, sampleProperty(lekki), { submit: true });
    propertyA = p.id;
    await reviewProperty(admin, propertyA, { decision: "APPROVE" });
    leadA = (await db.lead.findUniqueOrThrow({ where: { code: (await createInquiry(sampleInquiry(propertyA))).leadCode } })).id;
    const leadManager = await makeUser("LEAD_MANAGER");
    await addLeadNote(leadManager, leadA, { body: "INTERNAL: client budget is flexible", partnerVisible: false });
  });

  it("partner B cannot read partner A's lead (looks like not found)", async () => {
    await expect(getLeadForPartner(b.actor, leadA)).rejects.toThrow(/couldn't find/);
  });

  it("partner B's lead list never includes partner A's leads", async () => {
    await expect(listLeadsForPartner(b.actor, a.partner.id)).rejects.toThrow();
    expect(await listLeadsForPartner(b.actor, b.partner.id)).toHaveLength(0);
  });

  it("partner B cannot edit partner A's property or create listings for A", async () => {
    await expect(updateProperty(b.actor, propertyA, sampleProperty(lekki), { submit: true })).rejects.toThrow(/permission/);
    await expect(createProperty(b.actor, a.partner.id, sampleProperty(lekki), { submit: true })).rejects.toThrow(/permission/);
  });

  it("partners never see internal staff notes", async () => {
    const view = await getLeadForPartner(a.actor, leadA);
    expect(view.events.some((e) => e.body?.includes("INTERNAL"))).toBe(false);
  });

  it("partners and customers cannot use staff operations", async () => {
    await expect(reviewProperty(a.actor, propertyA, { decision: "APPROVE" })).rejects.toThrow(/permission/);
    await expect(setPartnerStatus(a.actor, a.partner.id, "APPROVED")).rejects.toThrow(/permission/);
    await expect(getLeadForStaff(customer, leadA)).rejects.toThrow(/permission/);
    await expect(updateLeadStatus(a.actor, leadA, "QUALIFIED")).rejects.toThrow(/permission/);
    await expect(introduceLeadToPartner(a.actor, leadA)).rejects.toThrow(/permission/);
    await expect(createAgreement(a.actor, { partnerId: a.partner.id, agreementDate: new Date("2026-01-01"), startDate: new Date("2026-01-01"), commissionType: "PERCENTAGE", commissionRatePercent: 0.01, attributionWindowDays: 1, paymentTermsDays: 0 })).rejects.toThrow(/permission/);
    await expect(createVerification(a.actor, { subjectType: "PROPERTY", subjectId: propertyA, category: "LISTING_VERIFIED", status: "ACTIVE" })).rejects.toThrow(/permission/);
  });

  it("staff roles are least-privilege", async () => {
    const content = await makeUser("CONTENT_MANAGER");
    const leadMgr = await makeUser("LEAD_MANAGER");
    const admin2 = await makeUser("ADMIN");
    await expect(getLeadForStaff(content, leadA)).rejects.toThrow(/permission/);
    await expect(recordCommissionPayment(leadMgr, "x", { amount: "1", paidAt: new Date("2026-01-01"), reference: "abc" })).rejects.toThrow(/permission/);
    await expect(updateSetting(admin2, "features.onlinePayments", true)).rejects.toThrow(/permission/);
  });

  it("partners cannot read another partner's commissions", async () => {
    await expect(listCommissionsForPartner(b.actor, a.partner.id)).rejects.toThrow();
  });

  it("system-only lead statuses cannot be set by hand", async () => {
    const lm = await makeUser("LEAD_MANAGER");
    await expect(updateLeadStatus(lm, leadA, "COMMISSION_PAID")).rejects.toThrow(/automatically/);
  });

  it("partner edits to a live listing send it back to review (nothing unreviewed goes public)", async () => {
    await updateProperty(a.actor, propertyA, sampleProperty(lekki, { title: "Edited title for the detached duplex" }), { submit: false });
    expect((await db.property.findUniqueOrThrow({ where: { id: propertyA } })).status).toBe("PENDING_REVIEW");
    expect((await searchProperties({})).items.find((p) => p.id === propertyA)).toBeUndefined();
    await reviewProperty(admin, propertyA, { decision: "APPROVE" });
  });

  it("suspending a partner hides all their listings immediately", async () => {
    await setPartnerStatus(admin, a.partner.id, "SUSPENDED", "Compliance review");
    expect(await db.property.count({ where: { id: propertyA, ...publicPropertyWhere() } })).toBe(0);
    await expect(createInquiry(sampleInquiry(propertyA))).rejects.toThrow(/no longer available/);
    await setPartnerStatus(admin, a.partner.id, "APPROVED");
    expect(await db.property.count({ where: { id: propertyA, ...publicPropertyWhere() } })).toBe(1);
  });

  it("verification badges only appear from active staff records", async () => {
    const before = (await searchProperties({ verified: true })).total;
    expect(before).toBe(0);
    await createVerification(admin, { subjectType: "PROPERTY", subjectId: propertyA, category: "LISTING_VERIFIED", status: "PENDING" });
    expect((await searchProperties({ verified: true })).total).toBe(0);
    await createVerification(admin, { subjectType: "PROPERTY", subjectId: propertyA, category: "LISTING_VERIFIED", status: "ACTIVE", reviewDueAt: new Date(Date.now() - 1000) });
    expect((await searchProperties({ verified: true })).total).toBe(0); // expired review date
    await createVerification(admin, { subjectType: "PROPERTY", subjectId: propertyA, category: "LISTING_VERIFIED", status: "ACTIVE" });
    expect((await searchProperties({ verified: true })).total).toBe(1);
  });

  it("input validation rejects mass assignment and bad data", async () => {
    // Unknown keys like status/featured/partnerId are stripped by the schema, never persisted.
    const p = await createProperty(b.actor, b.partner.id, { ...sampleProperty(lekki), status: "PUBLISHED", featured: true, partnerId: a.partner.id } as never, { submit: true });
    expect(p.status).toBe("PENDING_REVIEW");
    expect(p.featured).toBe(false);
    expect(p.partnerId).toBe(b.partner.id);
    await expect(createInquiry(sampleInquiry(propertyA, { phone: "12345" }))).rejects.toThrow();
    await expect(createInquiry(sampleInquiry(propertyA, { consent: false }))).rejects.toThrow();
  });
});
