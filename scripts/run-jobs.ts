import "dotenv/config";
import { runScheduledJobs } from "../src/server/services/jobs";
import { db } from "../src/server/db";

runScheduledJobs()
  .then((result) => console.info(JSON.stringify({ level: "info", msg: "jobs.completed", result }, (_k, v) => (typeof v === "bigint" ? v.toString() : v))))
  .catch((err) => {
    console.error(JSON.stringify({ level: "error", msg: "jobs.failed", error: err instanceof Error ? err.message : String(err) }));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
