/**
 * Vercel build entry point.
 * 1. Resolves the database URL from the names Vercel's Neon / Postgres integrations create.
 * 2. Applies migrations over the direct (non-pooled) connection, as Neon recommends.
 * 3. Builds Next.js.
 * Fails with a plain-English message when no database is configured for this environment.
 */
import { execSync } from "node:child_process";

const env = process.env;
const pooled = env.DATABASE_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL;
const direct = env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || pooled;
const target = env.VERCEL_ENV || "local";

if (!pooled) {
  console.error(`
  ✖ No database connection string found for the "${target}" environment.

    Fix in Vercel → your project → Settings → Environment Variables:
      • Add DATABASE_URL (your PostgreSQL / Neon connection string), and
      • tick BOTH "Production" and "Preview" (branch deploys use Preview).
    Or connect a database via Storage → Neon, choosing all environments.
    Then redeploy.
`);
  process.exit(1);
}

const run = (cmd, dbUrl) => execSync(cmd, { stdio: "inherit", env: { ...env, DATABASE_URL: dbUrl } });
console.log(`Applying database migrations (${target})…`);
run("npx prisma migrate deploy", direct);
console.log("Building Next.js…");
run("npx next build", pooled);
