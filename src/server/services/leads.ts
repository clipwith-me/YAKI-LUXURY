import { ContactPreference, LeadStatus, LeadType, type Lead, type LeadEventType, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db, type DbClient } from "@/server/db";
import { audit } from "@/server/audit";
import { assertPermission, isPartnerMember, type Actor } from "@/server/authz/policies";
import { hasPermission, isStaff } from "@/server/authz/permissions";
import { DomainError, forbidden, invalidState, notFound } from "@/server/errors";
import { notifyUsers, partnerUserIds, staffWithPermission } from "@/server/notifications/notify";
import { getSetting } from "@/server/settings";
import { raiseFlag } from "@/server/services/risk";
import { activeAgreementFor } from "@/server/services/partners";
import { publicPropertyWhere } from "@/server/services/properties";
import { CONSENT_VERSION, evidenceHash, protectedUntil } from "@/server/domain/attribution";
import { OPEN_STATUSES, isManualStatusAllowed, shouldAdvance } from "@/server/domain/lead-pipeline";
import { emailSchema, nameSchema, phoneSchema } from "@/server/validation/common";
import { formatLeadCode } from "@/lib/ids";
import type { FirstTouch } from "@/server/request";

export const inquirySchema = z.object({
  propertyId: z.string().min(1).optional(),
  type: z.nativeEnum(LeadType),
  fullName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  message: z.string().trim().max(2000).optional(),
  preferredContact: z.nativeEnum(ContactPreference).default("PHONE"),
  preferredViewingAt: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
  consent: z.literal(true, { errorMap: () => ({ message: "Please agree so we can contact you about this enquiry" }) }),
});
export type InquiryInput = z.input<typeof inquirySchema>;

export type InquiryContext = {
  userId?: string | null;
  referralUrl?: string | null;
  firstTouch?: FirstTouch;
  visitorHash?: string | null;
  source?: Prisma.LeadCreateInput["source"];
  now?: Date;
};

export type InquiryResult = { leadCode: string; repeat: boolean };

/** Atomically allocates the next human-readable Lead ID for the year (YLH-2026-00001). */
export async function nextLeadCode(tx: DbClient, now: Date): Promise<string> {
  const year = now.getUTCFullYear();
  const rows = await tx.$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO "LeadSequence" ("year", "lastValue") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "lastValue" = "LeadSequence"."lastValue" + 1
    RETURNING "lastValue"`;
  return formatLeadCode(year, rows[0]!.lastValue);
}

/**
 * Turns a customer enquiry into a Lead with immutable attribution evidence.
 *
 * - Same customer + same property while a lead is still open → logged on the existing lead
 *   (REPEAT_INQUIRY) instead of creating a duplicate.
 * - The partner is notified that a lead exists, WITHOUT customer contact details; staff make the
 *   introduction. This protects the customer's privacy and YAKI's referral position.
 */
export async function createInquiry(input: InquiryInput, ctx: InquiryContext = {}): Promise<InquiryResult> {
  const data = inquirySchema.parse(input);
  const now = ctx.now ?? new Date();

  const property = data.propertyId
    ? await db.property.findFirst({
        where: { id: data.propertyId, ...publicPropertyWhere() },
        select: { id: true, title: true, reference: true, partnerId: true },
      })
    : null;
  if (data.propertyId && !property) throw notFound("This property is no longer available.");
  if (data.type === "VIEWING_REQUEST" && !property) throw new DomainError("VALIDATION", "Choose a property to view.");

  const defaultWindow = await getSetting("attribution.defaultWindowDays");
  const phoneThreshold = await getSetting("risk.repeatedPhoneThreshold24h");

  return db.$transaction(async (tx) => {
    // Customer record: one per email. Never overwrite details on a record linked to an account.
    const existingCustomer = await tx.customer.findUnique({ where: { email: data.email } });
    const customer = existingCustomer
      ? await tx.customer.update({
          where: { id: existingCustomer.id },
          data: existingCustomer.userId
            ? { phone: existingCustomer.phone ?? data.phone }
            : { fullName: data.fullName, phone: data.phone, ...(ctx.userId ? { userId: ctx.userId } : {}) },
        })
      : await tx.customer.create({ data: { email: data.email, fullName: data.fullName, phone: data.phone, userId: ctx.userId ?? undefined } });

    if (property) {
      const open = await tx.lead.findFirst({
        where: { customerId: customer.id, propertyId: property.id, status: { in: OPEN_STATUSES } },
        orderBy: { createdAt: "desc" },
      });
      if (open) {
        await tx.lead.update({ where: { id: open.id }, data: { updatedAt: now } });
        await addEvent(tx, open.id, "REPEAT_INQUIRY", { body: data.message ?? `Repeat ${data.type.toLowerCase().replace(/_/g, " ")}`, metadata: { type: data.type } });
        if (data.type === "VIEWING_REQUEST") await requestViewingOnLead(tx, open, property.id, data.preferredViewingAt, null);
        return { leadCode: open.code, repeat: true };
      }
    }

    const code = await nextLeadCode(tx, now);
    const agreement = property ? await activeAgreementFor(tx, property.partnerId, now) : null;
    const windowDays = agreement?.attributionWindowDays ?? defaultWindow;
    const until = protectedUntil(now, windowDays);
    const ft = ctx.firstTouch ?? {};

    const lead = await tx.lead.create({
      data: {
        code,
        customerId: customer.id,
        propertyId: property?.id,
        partnerId: property?.partnerId,
        type: data.type,
        status: "NEW",
        source: ctx.source ?? "WEBSITE",
        message: data.message,
        preferredContact: data.preferredContact,
        preferredViewingAt: data.preferredViewingAt,
        createdAt: now,
      },
    });

    const evidence = {
      leadCode: code,
      customerId: customer.id,
      propertyId: property?.id ?? null,
      partnerId: property?.partnerId ?? null,
      agreementId: agreement?.id ?? null,
      createdAt: now.toISOString(),
      referralUrl: ctx.referralUrl ?? null,
      landingUrl: ft.landing ?? null,
      referrerUrl: ft.referrer ?? null,
      utmSource: ft.utm_source ?? null,
      utmMedium: ft.utm_medium ?? null,
      utmCampaign: ft.utm_campaign ?? null,
      attributionWindowDays: windowDays,
      protectedUntil: until.toISOString(),
      consentVersion: CONSENT_VERSION,
    };
    await tx.leadAttribution.create({
      data: {
        leadId: lead.id,
        agreementId: agreement?.id,
        firstTouchAt: ft.at ? new Date(ft.at) : null,
        landingUrl: ft.landing,
        referrerUrl: ft.referrer,
        referralUrl: ctx.referralUrl ?? undefined,
        utmSource: ft.utm_source,
        utmMedium: ft.utm_medium,
        utmCampaign: ft.utm_campaign,
        utmContent: ft.utm_content,
        utmTerm: ft.utm_term,
        visitorHash: ctx.visitorHash ?? undefined,
        attributionWindowDays: windowDays,
        protectedUntil: until,
        consentVersion: CONSENT_VERSION,
        evidenceHash: evidenceHash(evidence),
      },
    });

    await addEvent(tx, lead.id, "CREATED", {
      body: property ? `Enquiry received for ${property.title} (${property.reference})` : "General enquiry received",
      partnerVisible: true,
      metadata: { type: data.type, source: ctx.source ?? "WEBSITE" },
    });

    if (data.type === "VIEWING_REQUEST" && property) await requestViewingOnLead(tx, lead, property.id, data.preferredViewingAt, null);

    if (property) {
      const members = await partnerUserIds(tx, property.partnerId);
      await notifyUsers(tx, members, {
        type: "lead.new",
        title: `New lead ${code}`,
        body: `A client enquired about ${property.title}. YAKI'S LUXE HOMES will introduce the client to you shortly.`,
        link: `/partner/leads/${lead.id}`,
      });
      await tx.lead.update({ where: { id: lead.id }, data: { partnerNotifiedAt: now } });
      await addEvent(tx, lead.id, "PARTNER_NOTIFIED", { body: "Partner notified of new lead (client details withheld until introduction)", partnerVisible: true });
    }

    const leadManagers = await staffWithPermission(tx, "lead:manage");
    await notifyUsers(tx, leadManagers, {
      type: "lead.new",
      title: `New ${data.type.toLowerCase().replace(/_/g, " ")} — ${code}`,
      body: property ? property.title : "General enquiry",
      link: `/admin/leads/${lead.id}`,
    });

    // Risk: one phone number flooding enquiries is a spam/abuse signal for human review.
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentFromPhone = await tx.lead.count({ where: { createdAt: { gte: since }, customer: { phone: data.phone } } });
    if (recentFromPhone >= phoneThreshold) {
      await raiseFlag(tx, { subjectType: "CUSTOMER", subjectId: customer.id, reason: "REPEATED_PHONE", details: `${recentFromPhone} enquiries in 24h` });
    }

    return { leadCode: code, repeat: false };
  });
}

// ───────────── Internal helpers shared by viewing/offer/deal services ─────────────

export async function addEvent(
  tx: DbClient,
  leadId: string,
  type: LeadEventType,
  opts: { actorId?: string | null; body?: string; partnerVisible?: boolean; fromStatus?: LeadStatus; toStatus?: LeadStatus; channel?: string; metadata?: Prisma.InputJsonValue } = {},
): Promise<void> {
  await tx.leadEvent.create({
    data: {
      leadId,
      type,
      actorId: opts.actorId ?? null,
      body: opts.body,
      partnerVisible: opts.partnerVisible ?? false,
      fromStatus: opts.fromStatus,
      toStatus: opts.toStatus,
      channel: opts.channel,
      metadata: opts.metadata,
    },
  });
}

/** Moves a lead forward through the pipeline as a consequence of real events (viewing, offer, deal...). */
export async function advanceLead(tx: DbClient, lead: Pick<Lead, "id" | "status">, to: LeadStatus, actorId: string | null): Promise<void> {
  if (!shouldAdvance(lead.status, to)) return;
  await tx.lead.update({ where: { id: lead.id }, data: { status: to } });
  await addEvent(tx, lead.id, "STATUS_CHANGED", { actorId, fromStatus: lead.status, toStatus: to, partnerVisible: true });
  lead.status = to;
}

async function requestViewingOnLead(tx: DbClient, lead: Pick<Lead, "id" | "status">, propertyId: string, preferredAt: Date | undefined, actorId: string | null) {
  const pending = await tx.viewing.findFirst({ where: { leadId: lead.id, status: { in: ["REQUESTED", "SCHEDULED"] } } });
  if (!pending) {
    await tx.viewing.create({ data: { leadId: lead.id, propertyId, status: "REQUESTED", notes: preferredAt ? `Preferred: ${preferredAt.toISOString()}` : null, createdById: actorId } });
    await addEvent(tx, lead.id, "VIEWING_REQUESTED", { actorId, partnerVisible: true, body: "Client requested a viewing" });
  }
  await advanceLead(tx, lead, "VIEWING_REQUESTED", actorId);
}

/**
 * Loads a lead and enforces access: staff need `staffPermission`; partners must belong to the
 * lead's partner. When `requireIntroduced` is set, partners can only act after introduction.
 */
export async function loadLeadForActor(actor: Actor, leadId: string, staffPermission: "lead:read" | "lead:manage" | "deal:manage", opts: { requireIntroduced?: boolean } = {}) {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw notFound();
  if (isStaff(actor.role)) {
    if (!hasPermission(actor.role, staffPermission)) throw forbidden();
    return { lead, asPartner: false };
  }
  // Partners: deny without revealing whether the lead exists.
  if (!lead.partnerId || !isPartnerMember(actor, lead.partnerId)) throw notFound();
  if (opts.requireIntroduced && !lead.introducedToPartnerAt) throw invalidState("This lead hasn't been introduced to you yet.");
  return { lead, asPartner: true };
}

// ───────────── Staff pipeline actions ─────────────

export async function updateLeadStatus(actor: Actor, leadId: string, status: LeadStatus, note?: string) {
  assertPermission(actor, "lead:manage");
  if (!isManualStatusAllowed(status)) throw invalidState("Closed and commission statuses are set automatically from the deal and commission records.");
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw notFound();
  if (status === "LOST" && !note?.trim()) throw new DomainError("VALIDATION", "Record why the lead was lost.", { note: ["Required"] });
  if (lead.status === status) return lead;
  return db.$transaction(async (tx) => {
    const updated = await tx.lead.update({ where: { id: leadId }, data: { status, lostReason: status === "LOST" ? note : lead.lostReason } });
    await addEvent(tx, leadId, "STATUS_CHANGED", { actorId: actor.id, fromStatus: lead.status, toStatus: status, body: note, partnerVisible: true });
    await audit({ actorId: actor.id, action: "lead.status_changed", entityType: "Lead", entityId: leadId, before: { status: lead.status }, after: { status, note } }, tx);
    return updated;
  });
}

export async function assignLead(actor: Actor, leadId: string, assigneeId: string | null) {
  assertPermission(actor, "lead:assign");
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw notFound();
  if (assigneeId) {
    const assignee = await db.user.findUnique({ where: { id: assigneeId }, select: { role: true, status: true } });
    if (!assignee || assignee.status !== "ACTIVE" || !hasPermission(assignee.role, "lead:manage")) {
      throw new DomainError("VALIDATION", "Leads can only be assigned to active staff who manage leads.");
    }
  }
  await db.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { assignedToId: assigneeId } });
    await addEvent(tx, leadId, "ASSIGNED", { actorId: actor.id, metadata: { from: lead.assignedToId, to: assigneeId } });
    await audit({ actorId: actor.id, action: "lead.reassigned", entityType: "Lead", entityId: leadId, before: { assignedToId: lead.assignedToId }, after: { assignedToId: assigneeId } }, tx);
    if (assigneeId) await notifyUsers(tx, [assigneeId], { type: "lead.assigned", title: `Lead ${lead.code} assigned to you`, body: "Please follow up.", link: `/admin/leads/${leadId}` });
  });
}

/** Staff hand the client's contact details to the partner. From here the partner can see and act. */
export async function introduceLeadToPartner(actor: Actor, leadId: string, note?: string) {
  assertPermission(actor, "lead:introduce");
  const lead = await db.lead.findUnique({ where: { id: leadId }, include: { property: { select: { title: true } } } });
  if (!lead) throw notFound();
  if (!lead.partnerId) throw invalidState("This lead isn't linked to a partner property.");
  if (lead.introducedToPartnerAt) return;
  await db.$transaction(async (tx) => {
    const now = new Date();
    await tx.lead.update({ where: { id: leadId }, data: { introducedToPartnerAt: now } });
    await addEvent(tx, leadId, "INTRODUCED_TO_PARTNER", { actorId: actor.id, partnerVisible: true, body: note ?? "Client introduced to partner by YAKI'S LUXE HOMES" });
    await advanceLead(tx, lead, "CONTACTED", actor.id);
    await audit({ actorId: actor.id, action: "lead.introduced", entityType: "Lead", entityId: leadId }, tx);
    const members = await partnerUserIds(tx, lead.partnerId!);
    await notifyUsers(tx, members, {
      type: "lead.introduced",
      title: `Client introduced — ${lead.code}`,
      body: `Client details for ${lead.property?.title ?? "your property"} are now available. This client was referred by YAKI'S LUXE HOMES.`,
      link: `/partner/leads/${leadId}`,
    });
  });
}

export const noteSchema = z.object({
  body: z.string().trim().min(1, "Write a note").max(4000),
  kind: z.enum(["NOTE", "CONTACT_LOGGED"]).default("NOTE"),
  channel: z.enum(["PHONE", "EMAIL", "WHATSAPP", "MEETING", "OTHER"]).optional(),
  partnerVisible: z.boolean().default(false),
  nextFollowUpAt: z.coerce.date().optional(),
});

/** Notes from staff are internal unless explicitly shared; notes from partners are always visible to staff and the partner. */
export async function addLeadNote(actor: Actor, leadId: string, input: z.input<typeof noteSchema>) {
  const data = noteSchema.parse(input);
  const { lead, asPartner } = await loadLeadForActor(actor, leadId, "lead:manage");
  await db.$transaction(async (tx) => {
    await addEvent(tx, lead.id, data.kind, {
      actorId: actor.id,
      body: data.body,
      channel: data.channel,
      partnerVisible: asPartner ? true : data.partnerVisible,
    });
    if (!asPartner && data.nextFollowUpAt) await tx.lead.update({ where: { id: lead.id }, data: { nextFollowUpAt: data.nextFollowUpAt } });
  });
}

// ───────────── Read models ─────────────

const leadListInclude = {
  customer: { select: { fullName: true } },
  property: { select: { title: true, reference: true } },
  partner: { select: { companyName: true } },
  assignedTo: { select: { name: true } },
} satisfies Prisma.LeadInclude;

export async function listLeadsForStaff(actor: Actor, filters: { status?: LeadStatus; q?: string; page?: number }) {
  assertPermission(actor, "lead:read");
  const where: Prisma.LeadWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? { OR: [{ code: { contains: filters.q.toUpperCase() } }, { customer: { fullName: { contains: filters.q, mode: "insensitive" } } }, { property: { title: { contains: filters.q, mode: "insensitive" } } }] }
      : {}),
  };
  const page = filters.page ?? 1;
  const [total, items] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({ where, include: leadListInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * 25, take: 25 }),
  ]);
  return { total, items, page, pageCount: Math.max(1, Math.ceil(total / 25)) };
}

export async function getLeadForStaff(actor: Actor, leadId: string) {
  assertPermission(actor, "lead:read");
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      customer: true,
      property: { select: { id: true, title: true, reference: true, slug: true, priceKobo: true, pricePeriod: true, location: { select: { path: true, name: true } } } },
      partner: { select: { id: true, companyName: true, slug: true } },
      assignedTo: { select: { id: true, name: true } },
      attribution: { include: { agreement: { select: { reference: true } } } },
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true, role: true } } } },
      viewings: { orderBy: { createdAt: "desc" } },
      offers: { orderBy: { createdAt: "desc" } },
      deal: true,
      commission: { include: { payments: { orderBy: { paidAt: "asc" } } } },
    },
  });
  if (!lead) throw notFound();
  return lead;
}

/**
 * Partner view of a lead. Customer contact details are masked until introduction, and only
 * partner-visible timeline events are returned — internal staff notes never leave the server.
 */
export async function getLeadForPartner(actor: Actor, leadId: string) {
  const { lead } = await loadLeadForActor(actor, leadId, "lead:read");
  const full = await db.lead.findUniqueOrThrow({
    where: { id: lead.id },
    include: {
      customer: { select: { fullName: true, email: true, phone: true } },
      property: { select: { id: true, title: true, reference: true } },
      events: { where: { partnerVisible: true }, orderBy: { createdAt: "asc" }, select: { id: true, type: true, body: true, createdAt: true, toStatus: true, actor: { select: { name: true } } } },
      viewings: { orderBy: { createdAt: "desc" } },
      offers: { orderBy: { createdAt: "desc" } },
      deal: true,
      commission: { select: { expectedKobo: true, actualKobo: true, paidKobo: true, status: true, dueDate: true, invoiceNumber: true } },
      attribution: { select: { protectedUntil: true, createdAt: true } },
    },
  });
  const introduced = Boolean(full.introducedToPartnerAt);
  return {
    ...full,
    customer: introduced
      ? full.customer
      : { fullName: maskName(full.customer.fullName), email: null, phone: null },
    introduced,
  };
}

export function maskName(name: string): string {
  const [first = ""] = name.trim().split(/\s+/);
  return `${first.charAt(0).toUpperCase()}${"•".repeat(Math.max(2, Math.min(first.length - 1, 5)))}`;
}

export async function listLeadsForPartner(actor: Actor, partnerId: string, filters: { status?: LeadStatus } = {}) {
  if (!isPartnerMember(actor, partnerId)) throw forbidden();
  const leads = await db.lead.findMany({
    where: { partnerId, ...(filters.status ? { status: filters.status } : {}) },
    select: {
      id: true,
      code: true,
      status: true,
      type: true,
      createdAt: true,
      introducedToPartnerAt: true,
      customer: { select: { fullName: true } },
      property: { select: { title: true, reference: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return leads.map((l) => ({ ...l, customer: { fullName: l.introducedToPartnerAt ? l.customer.fullName : maskName(l.customer.fullName) } }));
}
