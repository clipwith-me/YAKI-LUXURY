import type { CommissionStatus, CommissionType } from "@prisma/client";
import { applyBasisPoints } from "@/lib/money";

export type CommissionTerms = {
  type: CommissionType;
  rateBps: number | null;
  fixedFeeKobo: bigint | null;
  source: "PROPERTY_OVERRIDE" | "AGREEMENT";
};

type TermsSource = { commissionType: CommissionType | null; commissionRateBps: number | null; fixedFeeKobo: bigint | null };

/** Property-level override wins over the partner agreement. Returns null when nothing is configured. */
export function resolveCommissionTerms(property: TermsSource, agreement: TermsSource | null): CommissionTerms | null {
  const pick = (s: TermsSource, source: CommissionTerms["source"]): CommissionTerms | null => {
    if (s.commissionType === "PERCENTAGE" && s.commissionRateBps != null) return { type: "PERCENTAGE", rateBps: s.commissionRateBps, fixedFeeKobo: null, source };
    if (s.commissionType === "FIXED" && s.fixedFeeKobo != null) return { type: "FIXED", rateBps: null, fixedFeeKobo: s.fixedFeeKobo, source };
    return null;
  };
  return pick(property, "PROPERTY_OVERRIDE") ?? (agreement ? pick(agreement, "AGREEMENT") : null);
}

export function calculateCommission(basisKobo: bigint, terms: CommissionTerms): bigint {
  if (basisKobo < 0n) throw new RangeError("Basis amount cannot be negative");
  return terms.type === "PERCENTAGE" ? applyBasisPoints(basisKobo, terms.rateBps ?? 0) : terms.fixedFeeKobo ?? 0n;
}

export const COMMISSION_TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  PENDING: ["DUE", "INVOICED", "PARTIALLY_PAID", "PAID", "DISPUTED", "WAIVED"],
  DUE: ["INVOICED", "PARTIALLY_PAID", "PAID", "DISPUTED", "WAIVED"],
  INVOICED: ["PARTIALLY_PAID", "PAID", "DISPUTED", "WAIVED"],
  PARTIALLY_PAID: ["PAID", "DISPUTED", "WAIVED"],
  DISPUTED: ["DUE", "INVOICED", "PARTIALLY_PAID", "PAID", "WAIVED"],
  PAID: [],
  WAIVED: [],
};

export function canTransitionCommission(from: CommissionStatus, to: CommissionStatus): boolean {
  return COMMISSION_TRANSITIONS[from].includes(to);
}

/** Status after a payment: PAID once the full amount owed has been received. */
export function statusAfterPayment(paidKobo: bigint, owedKobo: bigint): "PAID" | "PARTIALLY_PAID" {
  return paidKobo >= owedKobo ? "PAID" : "PARTIALLY_PAID";
}
