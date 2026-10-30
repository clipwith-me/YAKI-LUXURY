import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduledJobs } from "@/server/services/jobs";

/**
 * Scheduler entry point (e.g. Vercel Cron every 15 minutes). Protected by CRON_SECRET in the
 * Authorization header. Every job is idempotent.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestId = crypto.randomUUID();
  try {
    const result = await runScheduledJobs();
    return NextResponse.json(JSON.parse(JSON.stringify({ ok: true, requestId, result }, (_k, v) => (typeof v === "bigint" ? v.toString() : v))));
  } catch (err) {
    console.error(JSON.stringify({ level: "error", requestId, msg: "jobs.failed", error: err instanceof Error ? err.message : String(err) }));
    return NextResponse.json({ ok: false, requestId, error: "Job run failed" }, { status: 500 });
  }
}
export const GET = POST;
