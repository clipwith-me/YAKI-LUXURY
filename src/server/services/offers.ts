import { OfferStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import type { Actor } from "@/server/authz/policies";
import { invalidState, notFound } from "@/server/errors";
import { notifyUsers, staffWithPermission } from "@/server/notifications/notify";
import { addEvent, advanceLead, loadLeadForActor } from "@/server/services/leads";
import { nairaSchema } from "@/server/validation/common";
import { formatNaira } from "@/lib/money";

export const offerSchema = z.object({
  amount: nairaSchema.refine((v) => v > 0n, "Enter the offer amount"),
  notes: z.string().trim().max(1000).optional(),
});

/** Records an offer the client made to the partner. YAKI records it; it never receives funds. */
export async function recordOffer(actor: Actor, leadId: string, input: z.input<typeof offerSchema>) {
  const data = offerSchema.parse(input);
  const { lead, asPartner } = await loadLeadForActor(actor, leadId, "lead:manage", { requireIntroduced: true });
  if (!lead.propertyId) throw invalidState("This lead has no property.");
  return db.$transaction(async (tx) => {
    const offer = await tx.offer.create({ data: { leadId, propertyId: lead.propertyId!, amountKobo: data.amount, notes: data.notes, createdById: actor.id } });
    await addEvent(tx, leadId, "OFFER_RECORDED", { actorId: actor.id, partnerVisible: true, body: `Offer of ${formatNaira(data.amount)} recorded` });
    await advanceLead(tx, lead, "OFFER_MADE", actor.id);
    await audit({ actorId: actor.id, action: "offer.recorded", entityType: "Offer", entityId: offer.id, after: { amountKobo: data.amount } }, tx);
    if (asPartner) {
      const staff = lead.assignedToId ? [lead.assignedToId] : await staffWithPermission(tx, "lead:manage");
      await notifyUsers(tx, staff, { type: "offer.recorded", title: `Offer recorded — ${lead.code}`, body: formatNaira(data.amount), link: `/admin/leads/${leadId}` });
    }
    return offer;
  });
}

export async function updateOfferStatus(actor: Actor, offerId: string, status: OfferStatus) {
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw notFound();
  const { lead } = await loadLeadForActor(actor, offer.leadId, "lead:manage", { requireIntroduced: true });
  return db.$transaction(async (tx) => {
    const updated = await tx.offer.update({ where: { id: offerId }, data: { status } });
    await addEvent(tx, lead.id, "OFFER_UPDATED", { actorId: actor.id, partnerVisible: true, body: `Offer ${status.toLowerCase()}` });
    if (status === "COUNTERED" || status === "ACCEPTED") await advanceLead(tx, lead, "NEGOTIATION", actor.id);
    await audit({ actorId: actor.id, action: "offer.status_changed", entityType: "Offer", entityId: offerId, before: { status: offer.status }, after: { status } }, tx);
    return updated;
  });
}
