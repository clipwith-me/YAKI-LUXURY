import { ViewingMode } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import type { Actor } from "@/server/authz/policies";
import { invalidState, notFound } from "@/server/errors";
import { notifyUsers, partnerUserIds } from "@/server/notifications/notify";
import { addEvent, advanceLead, loadLeadForActor } from "@/server/services/leads";

export const scheduleViewingSchema = z.object({
  scheduledAt: z.coerce.date(),
  mode: z.nativeEnum(ViewingMode).default("IN_PERSON"),
  notes: z.string().trim().max(1000).optional(),
});

export async function scheduleViewing(actor: Actor, leadId: string, input: z.input<typeof scheduleViewingSchema>) {
  const data = scheduleViewingSchema.parse(input);
  if (data.scheduledAt.getTime() < Date.now() - 60 * 60 * 1000) throw invalidState("Choose a future date and time.");
  const { lead, asPartner } = await loadLeadForActor(actor, leadId, "lead:manage", { requireIntroduced: true });
  if (!lead.propertyId) throw invalidState("This lead has no property to view.");

  return db.$transaction(async (tx) => {
    const pending = await tx.viewing.findFirst({ where: { leadId, status: { in: ["REQUESTED", "SCHEDULED"] } }, orderBy: { createdAt: "desc" } });
    const viewing = pending
      ? await tx.viewing.update({ where: { id: pending.id }, data: { status: "SCHEDULED", scheduledAt: data.scheduledAt, mode: data.mode, notes: data.notes ?? pending.notes, reminderSentAt: null } })
      : await tx.viewing.create({ data: { leadId, propertyId: lead.propertyId!, status: "SCHEDULED", scheduledAt: data.scheduledAt, mode: data.mode, notes: data.notes, createdById: actor.id } });
    await addEvent(tx, leadId, "VIEWING_SCHEDULED", { actorId: actor.id, partnerVisible: true, body: `Viewing scheduled for ${data.scheduledAt.toISOString()}`, metadata: { viewingId: viewing.id } });
    await advanceLead(tx, lead, "VIEWING_SCHEDULED", actor.id);
    await audit({ actorId: actor.id, action: "viewing.scheduled", entityType: "Viewing", entityId: viewing.id, after: { scheduledAt: data.scheduledAt, mode: data.mode } }, tx);
    // Notify the other side: staff schedule → partner; partner schedule → assigned staff.
    const recipients = asPartner ? (lead.assignedToId ? [lead.assignedToId] : []) : lead.partnerId ? await partnerUserIds(tx, lead.partnerId) : [];
    await notifyUsers(tx, recipients, { type: "viewing.scheduled", title: `Viewing scheduled — ${lead.code}`, body: data.scheduledAt.toUTCString(), link: asPartner ? `/admin/leads/${leadId}` : `/partner/leads/${leadId}` });
    const customer = await tx.customer.findUnique({ where: { id: lead.customerId }, select: { userId: true } });
    if (customer?.userId) await notifyUsers(tx, [customer.userId], { type: "viewing.scheduled", title: "Your viewing is confirmed", body: data.scheduledAt.toUTCString(), link: "/account/viewings" }, ["IN_APP", "EMAIL", "SMS"]);
    return viewing;
  });
}

export const viewingOutcomeSchema = z.object({
  outcome: z.enum(["COMPLETED", "CANCELLED", "NO_SHOW"]),
  notes: z.string().trim().max(1000).optional(),
});

export async function recordViewingOutcome(actor: Actor, viewingId: string, input: z.input<typeof viewingOutcomeSchema>) {
  const data = viewingOutcomeSchema.parse(input);
  const viewing = await db.viewing.findUnique({ where: { id: viewingId } });
  if (!viewing) throw notFound();
  const { lead } = await loadLeadForActor(actor, viewing.leadId, "lead:manage", { requireIntroduced: true });
  if (!["REQUESTED", "SCHEDULED"].includes(viewing.status)) throw invalidState("This viewing is already closed.");
  return db.$transaction(async (tx) => {
    const updated = await tx.viewing.update({
      where: { id: viewingId },
      data: { status: data.outcome, completedAt: data.outcome === "COMPLETED" ? new Date() : null, notes: data.notes ?? viewing.notes },
    });
    await addEvent(tx, lead.id, data.outcome === "COMPLETED" ? "VIEWING_COMPLETED" : "VIEWING_CANCELLED", { actorId: actor.id, partnerVisible: true, body: data.notes });
    if (data.outcome === "COMPLETED") await advanceLead(tx, lead, "VIEWING_COMPLETED", actor.id);
    await audit({ actorId: actor.id, action: `viewing.${data.outcome.toLowerCase()}`, entityType: "Viewing", entityId: viewingId }, tx);
    return updated;
  });
}

/** Job: reminds partners/staff/customers of viewings in the next 24h, once. */
export async function sendViewingReminders(now = new Date()): Promise<number> {
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const due = await db.viewing.findMany({
    where: { status: "SCHEDULED", reminderSentAt: null, scheduledAt: { gt: now, lte: soon } },
    include: { lead: { select: { id: true, code: true, partnerId: true, assignedToId: true, customer: { select: { userId: true } } } } },
  });
  for (const v of due) {
    await db.$transaction(async (tx) => {
      const recipients = [...(v.lead.partnerId ? await partnerUserIds(tx, v.lead.partnerId) : []), ...(v.lead.assignedToId ? [v.lead.assignedToId] : [])];
      await notifyUsers(tx, recipients, { type: "viewing.reminder", title: `Viewing reminder — ${v.lead.code}`, body: v.scheduledAt!.toUTCString(), link: `/partner/leads/${v.lead.id}` });
      if (v.lead.customer.userId) await notifyUsers(tx, [v.lead.customer.userId], { type: "viewing.reminder", title: "Viewing reminder", body: v.scheduledAt!.toUTCString(), link: "/account/viewings" }, ["IN_APP", "EMAIL", "SMS"]);
      await tx.viewing.update({ where: { id: v.id }, data: { reminderSentAt: now } });
    });
  }
  return due.length;
}
