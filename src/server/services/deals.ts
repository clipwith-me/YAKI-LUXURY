import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import type { Actor } from "@/server/authz/policies";
import { DomainError, invalidState, notFound } from "@/server/errors";
import { notifyUsers, partnerUserIds, staffWithPermission } from "@/server/notifications/notify";
import { getSetting } from "@/server/settings";
import { addEvent, advanceLead, loadLeadForActor } from "@/server/services/leads";
import { activeAgreementFor } from "@/server/services/partners";
import { calculateCommission, resolveCommissionTerms } from "@/server/domain/commission";
import { isWithinWindow } from "@/server/domain/attribution";
import { nairaSchema } from "@/server/validation/common";
import { formatNaira } from "@/lib/money";

export const openDealSchema = z.object({
  agreedPrice: nairaSchema.refine((v) => v > 0n, "Enter the agreed price"),
  notes: z.string().trim().max(2000).optional(),
});

export async function openDeal(actor: Actor, leadId: string, input: z.input<typeof openDealSchema>) {
  const data = openDealSchema.parse(input);
  const { lead } = await loadLeadForActor(actor, leadId, "deal:manage", { requireIntroduced: true });
  if (!lead.propertyId || !lead.partnerId) throw invalidState("Deals need a partner property.");
  const existing = await db.deal.findUnique({ where: { leadId } });
  if (existing) throw new DomainError("CONFLICT", "A deal already exists for this lead.");
  return db.$transaction(async (tx) => {
    const deal = await tx.deal.create({
      data: { leadId, propertyId: lead.propertyId!, partnerId: lead.partnerId!, customerId: lead.customerId, agreedPriceKobo: data.agreedPrice, notes: data.notes },
    });
    await addEvent(tx, leadId, "DEAL_OPENED", { actorId: actor.id, partnerVisible: true, body: `Deal opened at ${formatNaira(data.agreedPrice)}` });
    await advanceLead(tx, lead, "NEGOTIATION", actor.id);
    await audit({ actorId: actor.id, action: "deal.opened", entityType: "Deal", entityId: deal.id, after: deal }, tx);
    return deal;
  });
}

export async function markContractSigned(actor: Actor, dealId: string, signedAt: Date = new Date()) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw notFound();
  const { lead } = await loadLeadForActor(actor, deal.leadId, "deal:manage", { requireIntroduced: true });
  if (deal.status !== "IN_PROGRESS") throw invalidState("Only in-progress deals can be marked as signed.");
  return db.$transaction(async (tx) => {
    const updated = await tx.deal.update({ where: { id: dealId }, data: { status: "CONTRACT_SIGNED", contractSignedAt: signedAt } });
    await addEvent(tx, lead.id, "STATUS_CHANGED", { actorId: actor.id, partnerVisible: true, body: "Contract signed" });
    await advanceLead(tx, lead, "CONTRACT_SIGNED", actor.id);
    await audit({ actorId: actor.id, action: "deal.contract_signed", entityType: "Deal", entityId: dealId }, tx);
    return updated;
  });
}

export const closeDealSchema = z.object({
  finalPrice: nairaSchema.optional(),
  closedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Closes a deal and calculates YAKI's commission in the same transaction.
 * The commission basis is the final transaction price reported for the deal. Terms resolve from a
 * property override, else the partner agreement in force at closing. No terms → closing is blocked
 * so revenue is never silently lost.
 */
export async function closeDeal(actor: Actor, dealId: string, input: z.input<typeof closeDealSchema> = {}) {
  const data = closeDealSchema.parse(input);
  const deal = await db.deal.findUnique({ where: { id: dealId }, include: { property: true, lead: { include: { attribution: true } } } });
  if (!deal) throw notFound();
  const { lead } = await loadLeadForActor(actor, deal.leadId, "deal:manage", { requireIntroduced: true });
  if (!["IN_PROGRESS", "CONTRACT_SIGNED"].includes(deal.status)) throw invalidState("This deal is already closed or cancelled.");

  const closedAt = data.closedAt ?? new Date();
  const basis = data.finalPrice ?? deal.agreedPriceKobo;
  const agreement = deal.property.agreementId
    ? await db.partnerAgreement.findUnique({ where: { id: deal.property.agreementId } })
    : await activeAgreementFor(db, deal.partnerId, closedAt);
  const terms = resolveCommissionTerms(deal.property, agreement);
  if (!terms) throw invalidState("No commission terms are configured for this partner or property. Add an active partner agreement first.");
  const expected = calculateCommission(basis, terms);
  const paymentTerms = agreement?.paymentTermsDays ?? (await getSetting("commission.defaultPaymentTermsDays"));
  const dueDate = new Date(closedAt.getTime() + paymentTerms * 24 * 60 * 60 * 1000);
  const within = deal.lead.attribution ? isWithinWindow(closedAt, deal.lead.attribution.protectedUntil) : null;

  return db.$transaction(async (tx) => {
    const closed = await tx.deal.update({
      where: { id: dealId },
      data: { status: "CLOSED", closedAt, closedById: actor.id, agreedPriceKobo: basis, withinAttributionWindow: within, notes: data.notes ?? deal.notes },
    });
    await tx.property.update({ where: { id: deal.propertyId }, data: { availability: deal.property.listingType === "RENT" ? "LET" : "SOLD" } });
    await addEvent(tx, lead.id, "DEAL_CLOSED", { actorId: actor.id, partnerVisible: true, body: `Deal closed at ${formatNaira(basis)}` });
    await advanceLead(tx, lead, "CLOSED", actor.id);

    const commission = await tx.commission.create({
      data: {
        dealId,
        leadId: lead.id,
        partnerId: deal.partnerId,
        propertyId: deal.propertyId,
        agreementId: agreement?.id,
        basisAmountKobo: basis,
        commissionType: terms.type,
        rateBps: terms.rateBps,
        fixedFeeKobo: terms.fixedFeeKobo,
        expectedKobo: expected,
        dueDate,
        status: "PENDING",
        notes: within === false ? "Closed after the attribution protection period — confirm eligibility under the agreement." : null,
      },
    });
    await addEvent(tx, lead.id, "COMMISSION_CREATED", { actorId: actor.id, partnerVisible: true, body: `Referral commission of ${formatNaira(expected)} calculated (${terms.type === "PERCENTAGE" ? `${(terms.rateBps ?? 0) / 100}%` : "fixed fee"})` });
    await advanceLead(tx, lead, "COMMISSION_PENDING", actor.id);
    await audit({ actorId: actor.id, action: "deal.closed", entityType: "Deal", entityId: dealId, before: { status: deal.status }, after: { status: "CLOSED", basis, commissionId: commission.id, expected, within } }, tx);

    const finance = await staffWithPermission(tx, "commission:manage");
    await notifyUsers(tx, finance, { type: "deal.closed", title: `Deal closed — ${lead.code}`, body: `Expected commission ${formatNaira(expected)}, due ${dueDate.toDateString()}`, link: `/admin/commissions/${commission.id}` });
    await notifyUsers(tx, await partnerUserIds(tx, deal.partnerId), { type: "commission.created", title: `Referral commission recorded — ${lead.code}`, body: `${formatNaira(expected)} due by ${dueDate.toDateString()} under your partnership agreement.`, link: "/partner/commissions" });
    return { deal: closed, commission };
  });
}

export async function cancelDeal(actor: Actor, dealId: string, reason: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw notFound();
  const { lead } = await loadLeadForActor(actor, deal.leadId, "deal:manage", { requireIntroduced: true });
  if (deal.status === "CLOSED") throw invalidState("Closed deals can't be cancelled — dispute the commission instead.");
  if (!reason.trim()) throw new DomainError("VALIDATION", "Record a reason.");
  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: dealId }, data: { status: "CANCELLED", notes: reason } });
    await addEvent(tx, lead.id, "STATUS_CHANGED", { actorId: actor.id, partnerVisible: true, body: `Deal cancelled: ${reason}` });
    await audit({ actorId: actor.id, action: "deal.cancelled", entityType: "Deal", entityId: dealId, after: { reason } }, tx);
  });
}
