import type { AnalyticsEventType, Prisma } from "@prisma/client";
import { db } from "@/server/db";

/** Fire-and-forget event capture. Analytics must never break a customer-facing request. */
export async function track(event: {
  type: AnalyticsEventType;
  propertyId?: string;
  partnerId?: string;
  userId?: string | null;
  visitorHash?: string | null;
  query?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        type: event.type,
        propertyId: event.propertyId,
        partnerId: event.partnerId,
        userId: event.userId ?? undefined,
        visitorHash: event.visitorHash ?? undefined,
        query: event.query?.slice(0, 200),
        metadata: event.metadata,
      },
    });
  } catch (err) {
    console.warn(JSON.stringify({ level: "warn", msg: "analytics.track_failed", type: event.type, error: err instanceof Error ? err.message : String(err) }));
  }
}
