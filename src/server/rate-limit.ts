import { db } from "@/server/db";
import { DomainError } from "@/server/errors";

/**
 * Fixed-window rate limiter backed by Postgres so limits hold across multiple app instances.
 * One upsert per check — fine for auth/inquiry volumes. Swap for Redis if traffic demands.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."windowStart" = ${windowStart} THEN "RateLimitBucket"."count" + 1 ELSE 1 END,
      "windowStart" = ${windowStart}
    RETURNING "count"`;
  const count = rows[0]?.count ?? 1;
  if (count > limit) {
    throw new DomainError("RATE_LIMITED", "Too many attempts. Please wait a moment and try again.");
  }
}
