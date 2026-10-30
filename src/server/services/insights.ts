import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { assertPermission, isPartnerMember, type Actor } from "@/server/authz/policies";
import { forbidden } from "@/server/errors";

const DAY = 24 * 60 * 60 * 1000;

function pct(n: number, d: number): number | null {
  return d === 0 ? null : Math.round((n / d) * 1000) / 10;
}

/** Executive overview. Every number is computed from records — nothing is hard-coded. */
export async function adminOverview(actor: Actor, days = 30) {
  assertPermission(actor, "dashboard:view");
  const since = new Date(Date.now() - days * DAY);
  const [
    propertiesByStatus,
    partnersByStatus,
    customers,
    leadsTotal,
    leadsPeriod,
    leadsNew,
    viewingsCompleted,
    offers,
    dealsClosed,
    commissionAgg,
    views,
    searches,
    pendingReview,
    pendingPartners,
    openFlags,
    followUpsDue,
  ] = await Promise.all([
    db.property.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    db.partner.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    db.customer.count(),
    db.lead.count(),
    db.lead.count({ where: { createdAt: { gte: since } } }),
    db.lead.count({ where: { status: "NEW" } }),
    db.viewing.count({ where: { status: "COMPLETED" } }),
    db.offer.count(),
    db.deal.count({ where: { status: "CLOSED" } }),
    db.commission.aggregate({ _sum: { expectedKobo: true, paidKobo: true }, where: { status: { not: "WAIVED" } } }),
    db.analyticsEvent.count({ where: { type: "PROPERTY_VIEW", createdAt: { gte: since } } }),
    db.analyticsEvent.count({ where: { type: "SEARCH", createdAt: { gte: since } } }),
    db.property.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }),
    db.partner.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    db.riskFlag.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    db.lead.count({ where: { nextFollowUpAt: { lte: new Date() }, status: { notIn: ["LOST", "COMMISSION_PAID"] } } }),
  ]);
  const leadsWithViewing = await db.lead.count({ where: { viewings: { some: { status: "COMPLETED" } } } });
  const leadsWithOffer = await db.lead.count({ where: { offers: { some: {} } } });
  const uniqueVisitors = await db.analyticsEvent.findMany({ where: { type: "PROPERTY_VIEW", createdAt: { gte: since }, visitorHash: { not: null } }, distinct: ["visitorHash"], select: { visitorHash: true } });
  const expected = commissionAgg._sum.expectedKobo ?? 0n;
  const paid = commissionAgg._sum.paidKobo ?? 0n;
  return {
    days,
    propertiesByStatus: Object.fromEntries(propertiesByStatus.map((r) => [r.status, r._count])),
    partnersByStatus: Object.fromEntries(partnersByStatus.map((r) => [r.status, r._count])),
    customers,
    leadsTotal,
    leadsPeriod,
    leadsNew,
    viewingsCompleted,
    offers,
    dealsClosed,
    commissionExpected: expected,
    commissionPaid: paid,
    commissionOutstanding: expected - paid,
    views,
    uniqueVisitors: uniqueVisitors.length,
    searches,
    queues: { pendingReview, pendingPartners, openFlags, followUpsDue },
    funnel: {
      leads: leadsTotal,
      viewings: leadsWithViewing,
      offers: leadsWithOffer,
      deals: dealsClosed,
      leadToViewing: pct(leadsWithViewing, leadsTotal),
      viewingToOffer: pct(leadsWithOffer, leadsWithViewing),
      offerToDeal: pct(dealsClosed, leadsWithOffer),
      leadToDeal: pct(dealsClosed, leadsTotal),
    },
  };
}

export async function topPerformers(actor: Actor) {
  assertPermission(actor, "dashboard:view");
  const [byPropertyLeads, byPartnerDeals, byLocation, searchTerms] = await Promise.all([
    db.lead.groupBy({ by: ["propertyId"], where: { propertyId: { not: null } }, _count: true, orderBy: { _count: { propertyId: "desc" } }, take: 5 }),
    db.deal.groupBy({ by: ["partnerId"], where: { status: "CLOSED" }, _count: true, orderBy: { _count: { partnerId: "desc" } }, take: 5 }),
    db.$queryRaw<Array<{ name: string; leads: bigint; deals: bigint }>>`
      SELECT l.name, COUNT(DISTINCT ld.id) AS leads, COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'CLOSED') AS deals
      FROM "Lead" ld
      JOIN "Property" p ON p.id = ld."propertyId"
      JOIN "Location" l ON l.id = p."locationId"
      LEFT JOIN "Deal" d ON d."leadId" = ld.id
      GROUP BY l.name ORDER BY leads DESC LIMIT 5`,
    db.analyticsEvent.groupBy({ by: ["query"], where: { type: "SEARCH", query: { not: null } }, _count: true, orderBy: { _count: { query: "desc" } }, take: 8 }),
  ]);
  const properties = await db.property.findMany({ where: { id: { in: byPropertyLeads.map((r) => r.propertyId!) } }, select: { id: true, title: true, reference: true } });
  const partners = await db.partner.findMany({ where: { id: { in: byPartnerDeals.map((r) => r.partnerId) } }, select: { id: true, companyName: true } });
  return {
    properties: byPropertyLeads.map((r) => ({ ...properties.find((p) => p.id === r.propertyId)!, leads: r._count })),
    partners: byPartnerDeals.map((r) => ({ ...partners.find((p) => p.id === r.partnerId)!, deals: r._count })),
    locations: byLocation.map((r) => ({ name: r.name, leads: Number(r.leads), deals: Number(r.deals), conversion: pct(Number(r.deals), Number(r.leads)) })),
    searchTerms: searchTerms.map((r) => ({ term: r.query!, count: r._count })),
  };
}

const PrismaSql = {
  byPartner: Prisma.sql`SELECT pa."companyName" AS label, SUM(c."expectedKobo") AS expected, SUM(c."paidKobo") AS paid, COUNT(*) AS count
    FROM "Commission" c JOIN "Partner" pa ON pa.id = c."partnerId" WHERE c.status <> 'WAIVED' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
  byProperty: Prisma.sql`SELECT p.title AS label, SUM(c."expectedKobo") AS expected, SUM(c."paidKobo") AS paid, COUNT(*) AS count
    FROM "Commission" c JOIN "Property" p ON p.id = c."propertyId" WHERE c.status <> 'WAIVED' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
  byLocation: Prisma.sql`SELECT l.name AS label, SUM(c."expectedKobo") AS expected, SUM(c."paidKobo") AS paid, COUNT(*) AS count
    FROM "Commission" c JOIN "Property" p ON p.id = c."propertyId" JOIN "Location" l ON l.id = p."locationId" WHERE c.status <> 'WAIVED' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
  bySource: Prisma.sql`SELECT COALESCE(NULLIF(a."utmSource", ''), lower(ld.source::text)) AS label, SUM(c."expectedKobo") AS expected, SUM(c."paidKobo") AS paid, COUNT(*) AS count
    FROM "Commission" c JOIN "Lead" ld ON ld.id = c."leadId" LEFT JOIN "LeadAttribution" a ON a."leadId" = ld.id WHERE c.status <> 'WAIVED' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
};

export type RevenueRow = { label: string; expected: bigint; paid: bigint; count: number };

/** Commission revenue by month (last 12), quarter, year, partner, property, location and source. */
export async function revenueReport(actor: Actor) {
  assertPermission(actor, "revenue:read");
  const monthly = await db.$queryRaw<Array<{ period: Date; expected: bigint; paid: bigint; count: bigint }>>`
    SELECT date_trunc('month', d."closedAt") AS period, SUM(c."expectedKobo") AS expected, SUM(c."paidKobo") AS paid, COUNT(*) AS count
    FROM "Commission" c JOIN "Deal" d ON d.id = c."dealId"
    WHERE c.status <> 'WAIVED' AND d."closedAt" >= date_trunc('month', now()) - interval '11 months'
    GROUP BY 1 ORDER BY 1`;
  const quarterly = await db.$queryRaw<Array<{ period: Date; expected: bigint; paid: bigint; count: bigint }>>`
    SELECT date_trunc('quarter', d."closedAt") AS period, SUM(c."expectedKobo") AS expected, SUM(c."paidKobo") AS paid, COUNT(*) AS count
    FROM "Commission" c JOIN "Deal" d ON d.id = c."dealId" WHERE c.status <> 'WAIVED'
    GROUP BY 1 ORDER BY 1 DESC LIMIT 8`;
  const annual = await db.$queryRaw<Array<{ period: Date; expected: bigint; paid: bigint; count: bigint }>>`
    SELECT date_trunc('year', d."closedAt") AS period, SUM(c."expectedKobo") AS expected, SUM(c."paidKobo") AS paid, COUNT(*) AS count
    FROM "Commission" c JOIN "Deal" d ON d.id = c."dealId" WHERE c.status <> 'WAIVED'
    GROUP BY 1 ORDER BY 1 DESC LIMIT 5`;
  const grouped = (sql: Prisma.Sql) => db.$queryRaw<Array<{ label: string; expected: bigint; paid: bigint; count: bigint }>>(sql);
  const [byPartner, byProperty, byLocation, bySource] = await Promise.all([
    grouped(PrismaSql.byPartner),
    grouped(PrismaSql.byProperty),
    grouped(PrismaSql.byLocation),
    grouped(PrismaSql.bySource),
  ]);
  const toRows = (rows: Array<{ label: string; expected: bigint; paid: bigint; count: bigint }>): RevenueRow[] =>
    rows.map((r) => ({ label: r.label, expected: r.expected ?? 0n, paid: r.paid ?? 0n, count: Number(r.count) }));
  const fmt = (rows: Array<{ period: Date; expected: bigint; paid: bigint; count: bigint }>, f: (d: Date) => string): RevenueRow[] =>
    rows.map((r) => ({ label: f(r.period), expected: r.expected ?? 0n, paid: r.paid ?? 0n, count: Number(r.count) }));
  const avg = await db.commission.aggregate({ _avg: { expectedKobo: true }, _count: true, where: { status: { not: "WAIVED" } } });
  return {
    monthly: fmt(monthly, (d) => d.toLocaleDateString("en-NG", { month: "short", year: "2-digit", timeZone: "UTC" })),
    quarterly: fmt(quarterly, (d) => `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`),
    annual: fmt(annual, (d) => String(d.getUTCFullYear())),
    byPartner: toRows(byPartner),
    byProperty: toRows(byProperty),
    byLocation: toRows(byLocation),
    bySource: toRows(bySource),
    averagePerDeal: avg._avg.expectedKobo ? BigInt(Math.round(Number(avg._avg.expectedKobo))) : null,
    deals: avg._count,
  };
}


/** Partner dashboard figures — strictly scoped to the partner's own records. */
export async function partnerOverview(actor: Actor, partnerId: string) {
  if (!isPartnerMember(actor, partnerId)) throw forbidden();
  const since = new Date(Date.now() - 30 * DAY);
  const [total, active, pending, views30, leads, leads30, viewings, deals, commission] = await Promise.all([
    db.property.count({ where: { partnerId, deletedAt: null } }),
    db.property.count({ where: { partnerId, status: "PUBLISHED", deletedAt: null } }),
    db.property.count({ where: { partnerId, status: "PENDING_REVIEW" } }),
    db.analyticsEvent.count({ where: { partnerId, type: "PROPERTY_VIEW", createdAt: { gte: since } } }),
    db.lead.count({ where: { partnerId } }),
    db.lead.count({ where: { partnerId, createdAt: { gte: since } } }),
    db.viewing.count({ where: { lead: { partnerId } } }),
    db.deal.count({ where: { partnerId, status: "CLOSED" } }),
    db.commission.aggregate({ where: { partnerId, status: { not: "WAIVED" } }, _sum: { expectedKobo: true, paidKobo: true } }),
  ]);
  return {
    total,
    active,
    pending,
    views30,
    leads,
    leads30,
    viewings,
    deals,
    commissionExpected: commission._sum.expectedKobo ?? 0n,
    commissionPaid: commission._sum.paidKobo ?? 0n,
  };
}
