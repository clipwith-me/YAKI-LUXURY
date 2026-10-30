# YAKI'S LUXE HOMES

A premium real-estate marketplace and referral platform for Nigeria, connecting serious buyers with trusted property partners.

Partners list authorised properties, which YAKI reviews and presents. Customers enquire, YAKI captures and attributes the lead and introduces the client, and the partner transacts. When a referred deal completes, the system calculates the agreed referral commission and tracks it until it is paid.

- **Architecture, data model, security, attribution and commission design:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Product decisions & open assumptions:** [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript (strict) · Tailwind CSS v4 · PostgreSQL 16 · Prisma 6 · zod · Vitest. Leaflet with OSM/CARTO tiles powers maps (no API key).

## Quick start

```bash
cp .env.example .env        # then set DATABASE_URL, TEST_DATABASE_URL, APP_SECRET, SEED_ADMIN_*
npm install
npx prisma migrate deploy   # or: npm run db:migrate (development)
npm run db:seed             # locations, amenities, settings, admin + clearly-labelled DEMO data
npm run dev                 # http://localhost:3000
```

### Seeded accounts (development only)

| Who | Email | Password |
|---|---|---|
| Super admin | `SEED_ADMIN_EMAIL` | `SEED_ADMIN_PASSWORD` |
| Lead manager / Property manager / Partner manager / Finance / Content / Support | `leads@` / `listings@` / `partners@` / `finance@` / `content@` / `support@yaki.demo` | `DemoPass-2026!` |
| Demo customer | `customer@yaki.demo` | `DemoPass-2026!` |
| Demo partner owners | `owner@harbourline-developments.demo`, `owner@crestview-realty.demo`, `owner@savannah-court-homes.demo`, `owner@lagoonfront-properties.demo` (pending) | `DemoPass-2026!` |

Demo data is **fictional and labelled DEMO everywhere**. It is seeded only when `NODE_ENV !== production` or `SEED_DEMO=true`. No leads, deals or commissions are seeded.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit + integration tests against `TEST_DATABASE_URL` (the test database is **wiped**) |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma migrations and seed |
| `npm run jobs:run` | Runs scheduled jobs once (commission due dates, viewing reminders, verification/document expiry, stale listings, follow-ups, property alerts, notification delivery) |

## Try the core loop

1. `/partner-with-us/apply`: apply as a partner, which signs you in to the portal as *pending*.
2. Sign in as the admin: **Partners** → approve the partner → add an agreement (e.g. 2%, 90 days).
3. As the partner: **Add property** → *Submit for review*.
4. Admin: **Properties** → approve. The listing is now live in search.
5. In a private window: find the property → **Request a viewing**. You'll get a lead ID such as `YLH-2026-00001`.
6. Partner: **Leads** shows the lead with the client's details masked.
7. Admin: open the lead → **Introduce** → schedule and complete the viewing → record an offer → open the deal → mark it closed. The commission is calculated from the agreement.
8. Admin: **Commissions** → record the partner's payment → *Paid*. **Attribution evidence** on the lead shows the integrity-checked origin record.

`tests/integration/business-loop.test.ts` automates the same loop.

## Deployment

### Vercel (recommended)

1. Create a PostgreSQL database. Either use **Vercel → Storage → Create → Neon** (this sets `DATABASE_URL` for you), or create one at [neon.tech](https://neon.tech) and copy the pooled URL with `?sslmode=require`.
2. **vercel.com/new → Import** `clipwith-me/yaki-luxury`. The framework is detected as Next.js.
3. **Environment variables** (Production and Preview):
   - `DATABASE_URL`
   - `APP_SECRET` (32+ random characters)
   - `CRON_SECRET` (32+ random characters)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://yaki-luxury.vercel.app`)
4. Deploy. `vercel.json` runs `prisma migrate deploy` before `next build`, and schedules `/api/jobs` daily. The Hobby plan allows daily crons; on Pro, change the schedule to every 15 minutes.
5. Seed once: `DATABASE_URL="<url>" SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... SEED_DEMO=true npm run db:seed`.
6. Every push to a branch gets its own **Preview URL**. Pushes to the production branch go live.

### Netlify

This is a full-stack app (server functions + PostgreSQL), so **don't use drag-and-drop deploys**. Netlify needs to build from the Git repository.

1. Create a PostgreSQL database, e.g. [Neon](https://neon.tech) (free tier). Copy its connection string.
2. Netlify → **Add new project → Import an existing project → GitHub →** `clipwith-me/yaki-luxury`, branch `claude/ecstatic-ride-h48xzp` (or `main` once merged).
3. **Site configuration → Environment variables**:
   - `DATABASE_URL`: the Neon string. Use the *pooled* URL with `?sslmode=require`.
   - `APP_SECRET`: 32+ random characters.
   - `CRON_SECRET`: 32+ random characters.
   - `NEXT_PUBLIC_SITE_URL`: e.g. `https://your-site.netlify.app`.
4. Deploy. `netlify.toml` runs `prisma migrate deploy` and then the build.
5. Seed once from your computer: `DATABASE_URL="<neon url>" SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed`. Add `SEED_DEMO=true` if you want the demo listings.

Limitation on serverless hosts: the `local` storage driver can't persist uploads, so photo and document *uploads* need the S3-compatible driver. Listing photos added as URLs work.

### General

- Any Node 20+ host with PostgreSQL works: Vercel + Neon/Supabase, Render, or Railway.
- Build command: `npx prisma migrate deploy && npm run build`.
- Required environment variables: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `APP_SECRET` (32+ random characters), `CRON_SECRET`. See `.env.example`.
- **Scheduler:** call `POST /api/jobs` with `Authorization: Bearer $CRON_SECRET` every 15 minutes (Vercel Cron / Render Cron).
- **Storage:** the `local` driver is for development only. Before launch, implement the S3-compatible driver in `src/server/storage` (R2, S3 or Spaces) and add the CDN host to `next.config.ts` `images.remotePatterns`.
- **Notifications:** email, SMS and WhatsApp drivers are placeholders (`log`). Connect providers in `src/server/notifications/channels.ts` once credentials, consent and messaging-policy review are in place.
- **Maps:** CARTO/OSM tiles suit low volume. Use a commercial tile plan for production traffic.

## Important

Legal pages are **templates** and must be reviewed by qualified Nigerian legal professionals. Features with regulatory implications (online payments, WhatsApp Business API, public reviews, exact addresses) ship **disabled** and can be switched on in **Admin → Settings** after review.
