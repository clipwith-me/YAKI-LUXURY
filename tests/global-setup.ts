import { execSync } from "node:child_process";

/**
 * Integration tests run against a dedicated, disposable database. Migrations are applied here
 * (non-destructive); each test file truncates tables in `resetDb()` before it runs.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database to run tests.");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL — tests wipe the database.");
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
