import type { LeadStatus } from "@prisma/client";

/** Forward order of the referral pipeline. LOST and DISPUTED sit outside it. */
export const PIPELINE: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VIEWING_REQUESTED",
  "VIEWING_SCHEDULED",
  "VIEWING_COMPLETED",
  "OFFER_MADE",
  "NEGOTIATION",
  "CONTRACT_SIGNED",
  "CLOSED",
  "COMMISSION_PENDING",
  "COMMISSION_DUE",
  "COMMISSION_PAID",
];

/** Statuses only the system sets, as a consequence of deal/commission records — never by hand. */
export const SYSTEM_STATUSES: LeadStatus[] = ["CLOSED", "COMMISSION_PENDING", "COMMISSION_DUE", "COMMISSION_PAID"];

export const OPEN_STATUSES: LeadStatus[] = PIPELINE.slice(0, PIPELINE.indexOf("CONTRACT_SIGNED") + 1);

/** Automatic progression only moves forward and never revives a LOST/DISPUTED lead. */
export function shouldAdvance(current: LeadStatus, target: LeadStatus): boolean {
  if (current === "LOST" || current === "DISPUTED") return false;
  return PIPELINE.indexOf(target) > PIPELINE.indexOf(current);
}

export function isManualStatusAllowed(target: LeadStatus): boolean {
  return !SYSTEM_STATUSES.includes(target);
}
