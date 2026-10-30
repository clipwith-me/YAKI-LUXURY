import { describe, expect, it } from "vitest";
import { applyBasisPoints, formatNaira, formatNairaCompact, nairaToKobo } from "@/lib/money";
import { formatNigerianPhone, normalizeNigerianPhone } from "@/lib/phone";
import { formatLeadCode, propertyReference } from "@/lib/ids";
import { calculateCommission, canTransitionCommission, resolveCommissionTerms, statusAfterPayment } from "@/server/domain/commission";
import { isManualStatusAllowed, shouldAdvance } from "@/server/domain/lead-pipeline";
import { canonicalJson, evidenceHash, isWithinWindow, protectedUntil } from "@/server/domain/attribution";
import { hasPermission, ROLE_PERMISSIONS } from "@/server/authz/permissions";

describe("money", () => {
  it("converts naira to kobo exactly", () => {
    expect(nairaToKobo("150,000,000")).toBe(15_000_000_000n);
    expect(nairaToKobo("1.5")).toBe(150n);
    expect(nairaToKobo(250_000_000)).toBe(25_000_000_000n);
    expect(() => nairaToKobo("abc")).toThrow();
  });
  it("matches the brief's commission example: 2% of ₦150,000,000 = ₦3,000,000", () => {
    expect(applyBasisPoints(nairaToKobo("150000000"), 200)).toBe(nairaToKobo("3000000"));
  });
  it("rounds half-up to the kobo", () => {
    expect(applyBasisPoints(1n, 5000)).toBe(1n); // 0.5 kobo → 1
    expect(applyBasisPoints(1n, 4999)).toBe(0n);
  });
  it("formats naira", () => {
    expect(formatNaira(nairaToKobo("3000000"))).toBe("₦3,000,000");
    expect(formatNairaCompact(nairaToKobo("250000000"))).toBe("₦250M");
    expect(formatNairaCompact(nairaToKobo("1200000000"))).toBe("₦1.2B");
  });
});

describe("Nigerian phone numbers", () => {
  it.each(["08031234567", "0803 123 4567", "+2348031234567", "2348031234567", "8031234567"])("normalizes %s", (input) => {
    expect(normalizeNigerianPhone(input)).toBe("+2348031234567");
  });
  it("rejects invalid numbers", () => {
    expect(normalizeNigerianPhone("12345")).toBeNull();
    expect(normalizeNigerianPhone("+4479460000000")).toBeNull();
  });
  it("formats for display", () => expect(formatNigerianPhone("+2348031234567")).toBe("+234 803 123 4567"));
});

describe("identifiers", () => {
  it("formats lead codes like YLH-2026-00482", () => expect(formatLeadCode(2026, 482)).toBe("YLH-2026-00482"));
  it("generates non-sequential property references", () => {
    const refs = new Set(Array.from({ length: 200 }, () => propertyReference()));
    expect(refs.size).toBe(200);
    for (const r of refs) expect(r).toMatch(/^YLP-[2-9A-Z]{6}$/);
  });
});

describe("commission", () => {
  const none = { commissionType: null, commissionRateBps: null, fixedFeeKobo: null };
  it("uses the property override before the agreement", () => {
    const terms = resolveCommissionTerms({ commissionType: "FIXED", commissionRateBps: null, fixedFeeKobo: 500_000_00n }, { commissionType: "PERCENTAGE", commissionRateBps: 200, fixedFeeKobo: null });
    expect(terms).toMatchObject({ type: "FIXED", source: "PROPERTY_OVERRIDE" });
    expect(calculateCommission(nairaToKobo("150000000"), terms!)).toBe(500_000_00n);
  });
  it("falls back to the agreement and returns null when nothing is configured", () => {
    expect(resolveCommissionTerms(none, { commissionType: "PERCENTAGE", commissionRateBps: 250, fixedFeeKobo: null })).toMatchObject({ rateBps: 250, source: "AGREEMENT" });
    expect(resolveCommissionTerms(none, null)).toBeNull();
  });
  it("enforces status transitions", () => {
    expect(canTransitionCommission("PENDING", "DUE")).toBe(true);
    expect(canTransitionCommission("PAID", "DUE")).toBe(false);
    expect(canTransitionCommission("WAIVED", "PAID")).toBe(false);
  });
  it("derives payment status", () => {
    expect(statusAfterPayment(100n, 300n)).toBe("PARTIALLY_PAID");
    expect(statusAfterPayment(300n, 300n)).toBe("PAID");
  });
});

describe("lead pipeline", () => {
  it("only advances forward", () => {
    expect(shouldAdvance("NEW", "VIEWING_SCHEDULED")).toBe(true);
    expect(shouldAdvance("OFFER_MADE", "VIEWING_SCHEDULED")).toBe(false);
    expect(shouldAdvance("LOST", "CONTACTED")).toBe(false);
  });
  it("reserves closed/commission statuses for the system", () => {
    expect(isManualStatusAllowed("QUALIFIED")).toBe(true);
    expect(isManualStatusAllowed("COMMISSION_PAID")).toBe(false);
    expect(isManualStatusAllowed("CLOSED")).toBe(false);
  });
});

describe("attribution", () => {
  it("computes protection windows from configurable days", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    expect(protectedUntil(start, 90).toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(isWithinWindow(new Date("2026-03-31T00:00:00Z"), protectedUntil(start, 90))).toBe(true);
    expect(isWithinWindow(new Date("2026-04-02T00:00:00Z"), protectedUntil(start, 90))).toBe(false);
  });
  it("hashes evidence deterministically regardless of key order", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    const ev = { leadCode: "YLH-2026-00001", customerId: "c", propertyId: "p", partnerId: "x", agreementId: null, createdAt: "t", referralUrl: null, landingUrl: null, referrerUrl: null, utmSource: null, utmMedium: null, utmCampaign: null, attributionWindowDays: 90, protectedUntil: "u", consentVersion: "v" };
    expect(evidenceHash(ev)).toBe(evidenceHash({ ...ev }));
    expect(evidenceHash(ev)).not.toBe(evidenceHash({ ...ev, partnerId: "y" }));
  });
});

describe("permissions", () => {
  it("gives each staff role a distinct, least-privilege set", () => {
    expect(hasPermission("FINANCE", "commission:manage")).toBe(true);
    expect(hasPermission("LEAD_MANAGER", "commission:manage")).toBe(false);
    expect(hasPermission("CONTENT_MANAGER", "lead:read")).toBe(false);
    expect(hasPermission("SUPPORT", "lead:manage")).toBe(false);
    expect(hasPermission("ADMIN", "settings:manage")).toBe(false);
    expect(hasPermission("SUPER_ADMIN", "settings:manage")).toBe(true);
    expect(ROLE_PERMISSIONS.PARTNER.size).toBe(0);
    expect(ROLE_PERMISSIONS.CUSTOMER.size).toBe(0);
  });
});
