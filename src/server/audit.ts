import type { Prisma } from "@prisma/client";
import type { DbClient } from "@/server/db";
import { db } from "@/server/db";

type Json = Prisma.InputJsonValue;

/** Strips values that must never land in the audit trail and converts bigint for JSON. */
function sanitize(value: unknown): Json | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(
    JSON.stringify(value, (key, v) => {
      if (/password|token|secret/i.test(key)) return "[redacted]";
      return typeof v === "bigint" ? v.toString() : v;
    }),
  ) as Json;
}

export async function audit(
  entry: { actorId: string | null; action: string; entityType: string; entityId: string; before?: unknown; after?: unknown },
  client: DbClient = db,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: sanitize(entry.before),
      after: sanitize(entry.after),
    },
  });
}
