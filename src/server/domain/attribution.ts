import { createHash } from "node:crypto";

export const CONSENT_VERSION = "inquiry-consent-2026-10";

export type AttributionEvidence = {
  leadCode: string;
  customerId: string;
  propertyId: string | null;
  partnerId: string | null;
  agreementId: string | null;
  createdAt: string;
  referralUrl: string | null;
  landingUrl: string | null;
  referrerUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  attributionWindowDays: number;
  protectedUntil: string;
  consentVersion: string;
};

/** Deterministic JSON (sorted keys) so the same evidence always produces the same hash. */
export function canonicalJson(value: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(value).sort().reduce<Record<string, unknown>>((acc, k) => ((acc[k] = value[k]), acc), {}));
}

export function evidenceHash(evidence: AttributionEvidence): string {
  return createHash("sha256").update(canonicalJson(evidence)).digest("hex");
}

export function protectedUntil(createdAt: Date, windowDays: number): Date {
  return new Date(createdAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
}

export function isWithinWindow(at: Date, until: Date): boolean {
  return at.getTime() <= until.getTime();
}
