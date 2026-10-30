import { CommissionStatus, PaymentMethod, type LeadStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { assertPermission, isPartnerMember, type Actor } from "@/server/authz/policies";
import { DomainError, forbidden, invalidState, notFound } from "@/server/errors";
import { notifyUsers, partnerUserIds, staffWithPermission } from "@/server/notifications/notify";
import { addEvent } from "@/server/services/leads";
import { canTransitionCommission, statusAfterPayment } from "@/server/domain/commission";
import { nairaSchema } from "@/server/validation/common";
import { formatNaira } from "@/lib/money";
import { randomCode } from "@/lib/ids";

const LEAD_STATUS_FOR: Partial<Record<CommissionStatus, LeadStatus>> = {
  DUE: "COMMISSION_DUE",
  INVOICED: "COMMISSION_DUE",
  PARTIALLY_PAID: "COMMISSION_DUE",
  PAID: "COMMISSION_PAID",
  DISPUTED: "DISPUTED",
};

async function syncLead(tx: Prisma.TransactionClient, leadId: string, status: CommissionStatus, actorId: string | null, body: string) {
  const target = LEAD_STATUS_FOR[status];
  const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, select: { status: true } });
  if (target && lead.status !== target) {
    await tx.lead.update({ where: { id: leadId }, data: { status: target } });
  }
  await addEvent(tx, leadId, "COMMISSION_UPDATED", { actorId, partnerVisible: true, body, fromStatus: lead.status, toStatus: target ?? lead.status });
}

export const commissionTransitionSchema = z.object({
  status: z.enum(["DUE", "INVOICED", "DISPUTED", "WAIVED"]),
  reason: z.string().trim().max(2000).optional(),
});

export async function transitionCommission(actor: Actor | null, commissionId: string, input: z.input<typeof commissionTransitionSchema>) {
  if (actor) assertPermission(actor, "commission:manage");
  const { status, reason } = commissionTransitionSchema.parse(input);
  const before = await db.commission.findUnique({ where: { id: commissionId }, include: { lead: { select: { code: true } } } });
  if (!before) throw notFound();
  if (!canTransitionCommission(before.status, status)) throw invalidState(`Commission can't move from ${before.status} to ${status}.`);
  if ((status === "DISPUTED" || status === "WAIVED") && !reason) throw new DomainError("VALIDATION", "Record a reason.", { reason: ["Required"] });

  return db.$transaction(async (tx) => {
    const after = await tx.commission.update({
      where: { id: commissionId },
      data: {
        status,
        ...(status === "INVOICED" ? { invoiceNumber: before.invoiceNumber ?? `YLI-${new Date().getFullYear()}-${randomCode(6)}`, invoicedAt: new Date() } : {}),
        notes: reason ? `${before.notes ? `${before.notes}\n` : ""}[${status}] ${reason}` : before.notes,
      },
    });
    await syncLead(tx, before.leadId, status, actor?.id ?? null, `Commission ${status.toLowerCase().replace("_", " ")}${reason ? `: ${reason}` : ""}`);
    await audit({ actorId: actor?.id ?? null, action: `commission.${status.toLowerCase()}`, entityType: "Commission", entityId: commissionId, before: { status: before.status }, after: { status, reason } }, tx);
    if (status === "DUE" || status === "INVOICED") {
      const partnerUsers = await partnerUserIds(tx, before.partnerId);
      await notifyUsers(tx, partnerUsers, { type: "commission.due", title: `Commission ${status === "DUE" ? "due" : "invoiced"} — ${before.lead.code}`, body: `${formatNaira(before.actualKobo ?? before.expectedKobo)} is due under your partnership agreement.`, link: "/partner/commissions" });
      if (status === "DUE") await notifyUsers(tx, await staffWithPermission(tx, "commission:manage"), { type: "commission.due", title: `Commission due — ${before.lead.code}`, body: formatNaira(before.actualKobo ?? before.expectedKobo), link: `/admin/commissions/${commissionId}` });
    }
    return after;
  });
}

export const adjustCommissionSchema = z.object({
  actualAmount: nairaSchema,
  reason: z.string().trim().min(3, "Explain the adjustment").max(2000),
});

/** Finance can set the actual amount (e.g. negotiated). Every change is audited with the reason. */
export async function adjustCommission(actor: Actor, commissionId: string, input: z.input<typeof adjustCommissionSchema>) {
  assertPermission(actor, "commission:manage");
  const data = adjustCommissionSchema.parse(input);
  const before = await db.commission.findUnique({ where: { id: commissionId } });
  if (!before) throw notFound();
  if (before.status === "PAID" || before.status === "WAIVED") throw invalidState("Settled commissions can't be adjusted.");
  return db.$transaction(async (tx) => {
    const after = await tx.commission.update({ where: { id: commissionId }, data: { actualKobo: data.actualAmount } });
    await addEvent(tx, before.leadId, "COMMISSION_UPDATED", { actorId: actor.id, body: `Commission amount set to ${formatNaira(data.actualAmount)}: ${data.reason}`, partnerVisible: true });
    await audit({ actorId: actor.id, action: "commission.changed", entityType: "Commission", entityId: commissionId, before: { actualKobo: before.actualKobo, expectedKobo: before.expectedKobo }, after: { actualKobo: data.actualAmount, reason: data.reason } }, tx);
    return after;
  });
}

export const paymentSchema = z.object({
  amount: nairaSchema.refine((v) => v > 0n, "Enter the amount received"),
  paidAt: z.coerce.date(),
  method: z.nativeEnum(PaymentMethod).default("BANK_TRANSFER"),
  reference: z.string().trim().min(3, "Enter the bank/payment reference").max(120),
  notes: z.string().trim().max(1000).optional(),
});

/**
 * Records a commission payment received FROM the partner. Idempotent per bank reference, so a
 * double-submitted form can't double-count revenue.
 */
export async function recordCommissionPayment(actor: Actor, commissionId: string, input: z.input<typeof paymentSchema>) {
  assertPermission(actor, "commission:manage");
  const data = paymentSchema.parse(input);
  return db.$transaction(async (tx) => {
    // Lock the row so concurrent payments compute paidKobo correctly.
    await tx.$queryRaw`SELECT id FROM "Commission" WHERE id = ${commissionId} FOR UPDATE`;
    const c = await tx.commission.findUnique({ where: { id: commissionId }, include: { lead: { select: { code: true } } } });
    if (!c) throw notFound();
    if (c.status === "PAID" || c.status === "WAIVED") throw invalidState("This commission is already settled.");
    const dup = await tx.commissionPayment.findUnique({ where: { commissionId_reference: { commissionId, reference: data.reference } } });
    if (dup) throw new DomainError("CONFLICT", "A payment with this reference is already recorded.");

    await tx.commissionPayment.create({
      data: { commissionId, amountKobo: data.amount, paidAt: data.paidAt, method: data.method, reference: data.reference, notes: data.notes, recordedById: actor.id },
    });
    const paid = c.paidKobo + data.amount;
    const owed = c.actualKobo ?? c.expectedKobo;
    const status = statusAfterPayment(paid, owed);
    const after = await tx.commission.update({ where: { id: commissionId }, data: { paidKobo: paid, status, paidAt: status === "PAID" ? data.paidAt : null } });
    await syncLead(tx, c.leadId, status, actor.id, `Commission payment of ${formatNaira(data.amount)} received (${status === "PAID" ? "paid in full" : `${formatNaira(owed - paid)} outstanding`})`);
    await audit({ actorId: actor.id, action: status === "PAID" ? "commission.marked_paid" : "commission.payment_recorded", entityType: "Commission", entityId: commissionId, before: { status: c.status, paidKobo: c.paidKobo }, after: { status, paidKobo: paid, reference: data.reference } }, tx);
    if (status === "PAID") {
      await notifyUsers(tx, await partnerUserIds(tx, c.partnerId), { type: "commission.paid", title: `Commission received — ${c.lead.code}`, body: "Thank you. Your referral commission has been received in full.", link: "/partner/commissions" });
    }
    return after;
  });
}

/** Job: PENDING commissions past their due date become DUE (and finance + partner are notified). */
export async function markOverdueCommissionsDue(now = new Date()): Promise<number> {
  const due = await db.commission.findMany({ where: { status: "PENDING", dueDate: { lte: now } }, select: { id: true } });
  for (const c of due) await transitionCommission(null, c.id, { status: "DUE" });
  return due.length;
}

export async function listCommissionsForPartner(actor: Actor, partnerId: string) {
  if (!isPartnerMember(actor, partnerId)) throw forbidden();
  return db.commission.findMany({
    where: { partnerId },
    select: {
      id: true,
      status: true,
      expectedKobo: true,
      actualKobo: true,
      paidKobo: true,
      dueDate: true,
      invoiceNumber: true,
      createdAt: true,
      basisAmountKobo: true,
      commissionType: true,
      rateBps: true,
      lead: { select: { id: true, code: true } },
      property: { select: { title: true, reference: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
