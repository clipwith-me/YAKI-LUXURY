# YAKI'S LUXE HOMES — Architecture

> A premium real-estate marketplace and referral platform connecting serious buyers with trusted property partners in Nigeria.

This document covers the 18 architecture items requested in the product brief. It describes **what exists in this repository**; future work is labelled as such.

---

## Executive summary

- **Business model in software:** Partner → reviewed listing → customer enquiry → **Lead (YLH-YYYY-NNNNN) with tamper-evident attribution** → staff introduction → viewing → offer → deal → **commission calculated from the partner agreement** → due → paid. Every step is a database record with an audit trail.
- **Stack:** Next.js 15 (App Router, Server Components, Server Actions), TypeScript (strict), Tailwind CSS v4, PostgreSQL 16 and Prisma 6. It is one deployable modular monolith.
- **Lean by design:** 7 runtime dependencies. There are no microservices, queues, Redis or paid APIs at MVP. Background work runs through idempotent jobs triggered by a cron hitting `/api/jobs`.
- **Trust by construction:** The platform never claims a verification it hasn't recorded, never holds customer purchase money, and never shows a customer's contact details to a partner before staff make the introduction.
- **Proven loop:** Integration tests run the full partner → commission-paid cycle against PostgreSQL, alongside cross-tenant and authorization tests. A browser run of the same loop was performed against the production build.

---

## 1. Product architecture

| Surface | Audience | Purpose |
|---|---|---|
| Public site `(site)/` | Buyers, renters, partners | Discovery, SEO, conversion (enquiries, viewings, alerts, partner applications) |
| Customer account `/account` | Signed-in customers | Saved homes, recently viewed, enquiries & viewings, alerts, notifications, profile |
| Partner portal `/partner` | Partner users | Listings, submissions, leads (masked until introduction), viewings, offers & deals, commission, documents, profile |
| Admin console `/admin` | Staff (8 roles) | Moderation, partner onboarding, agreements, lead pipeline, commissions, verification, risk queue, journal, users, settings, audit, BI |

**Core loop (spec §61)** is implemented and tested end to end; see `tests/integration/business-loop.test.ts`.

## 2. Technical architecture

```
Browser ──► Next.js (RSC pages + Server Actions + Route Handlers)
              │  thin controllers: parse FormData → call service → ActionResult
              ▼
           src/server/services/*      application services (business rules, authz, transactions)
              │  uses
              ├─ src/server/domain/*  pure logic: commission maths, pipeline rules, attribution hashing
              ├─ src/server/authz/*   permission catalogue + policies (single source of truth)
              ├─ src/server/search/*  SearchFilters schema, query engine, NL interpreter (pluggable)
              ├─ src/server/notifications/* outbox + channel drivers (email/SMS/WhatsApp placeholders)
              ├─ src/server/storage/*  storage driver (local now; S3-compatible later)
              ▼
           Prisma ──► PostgreSQL
```

Rules that are enforced in code:
- No business logic in pages or route handlers. Pages read through services or scoped queries, and mutations go through services.
- Every service call takes an `Actor` (`id`, `role`, `partnerIds`), and authorization runs **inside** the service.
- Money is `BigInt` kobo and rates are integer basis points. No floats in money paths.
- Customer-facing errors are always safe messages. Unexpected errors are logged with a `requestId`, and only that reference reaches the user.

## 3. Database architecture

PostgreSQL with Prisma migrations (`prisma/migrations`). Seed data is separate (`prisma/seed.ts`). Full schema: `prisma/schema.prisma`. Highlights:

- **Identity:** `User`, `Session` (hashed tokens), `Customer` (guests and account holders; leads always point to a Customer, so attribution survives sign-up).
- **Supply:** `Partner`, `PartnerUser`, `PartnerAgreement`, `Property`, `PropertyImage`, `PropertyVideo`, `Amenity`, `PropertyAmenity`, `Location` (State → Area tree with SEO `path`).
- **Trust:** `VerificationRecord`, `Document`, `RiskFlag`, `Review`.
- **Revenue loop:** `Lead`, `LeadAttribution` (write-once), `LeadEvent` (append-only), `LeadSequence`, `Viewing`, `Offer`, `Deal`, `Commission`, `CommissionPayment`.
- **Engagement:** `Favorite`, `PropertyAlert`, `Notification`, `NotificationDelivery` (outbox), `NewsletterSubscriber`, `Message` (schema-ready; UI uses the lead timeline for now).
- **Platform:** `AuditLog`, `AnalyticsEvent`, `PlatformSetting`, `RateLimitBucket`, `Article`.

Indexes target real query paths: search (`status, listingType, locationId, priceKobo`), partner scoping (`partnerId, status`), queues (`status, createdAt`), jobs (`status, dueDate`, `expiresAt`). Uniqueness constraints carry business invariants: one deal per lead, one commission per deal, payment reference unique per commission, `Lead.code` unique.

## 4. User roles

| Role | Can |
|---|---|
| SUPER_ADMIN | Everything, including platform settings and creating super admins |
| ADMIN | Everything except platform settings |
| PROPERTY_MANAGER | Review/edit/feature listings, verification, document review, risk |
| LEAD_MANAGER | Lead pipeline, assignment, introductions, deals, read commissions |
| PARTNER_MANAGER | Partner review/edit, agreements, verification, documents |
| FINANCE | Commission management, revenue, analytics, agreements |
| CONTENT_MANAGER | Journal, review moderation |
| SUPPORT | Read leads/partners, moderate reviews |
| PARTNER | Own organisation only (scoped by `partnerIds`) |
| CUSTOMER | Own favourites, alerts, enquiries, profile |

Defined in `src/server/authz/permissions.ts`. Changing a role's permissions is a one-line edit. A future step is moving the map into the database for UI-configurable roles.

## 5. Customer journey

Discover (search, filters, map, natural-language "Describe it", locations, collections) → property page (gallery, facts, honest verification panel, partner identity, approximate map) → **one-step enquiry** with four intents (viewing / information / advisor / purchase interest) or WhatsApp → instant reference `YLH-2026-00482` → optional account (saved homes, alerts, enquiry tracking) → advisor call → introduction to partner → viewing → negotiate and complete directly with the partner and their own lawyer.

## 6. Partner journey

Apply (`/partner-with-us/apply`, creates login + organisation in `PENDING`) → upload documents → staff review → **approved** → agreement recorded (commission %, fixed fee, protection window, payment terms) → submit listings (always `PENDING_REVIEW`; edits to live listings go back to review) → lead notifications (client masked) → introduction unlocks client details and actions → record viewings, offers, deals → see commission calculated → pay → receive confirmation.

## 7. Admin journey

Queues on the overview (listings awaiting review, partner applications, risk flags, follow-ups due) → approve/reject/request changes with notes → manage agreements and verification → work leads (assign, log contact, schedule follow-ups, introduce) → close deals → finance invoices and records payments → revenue reporting → audit log for every sensitive action.

## 8. Lead attribution model

- **First touch** is captured by middleware in an httpOnly cookie on the first visit: landing URL, external referrer and UTM parameters. The anonymous visitor ID is random and stored only as a keyed hash.
- On enquiry, a **write-once `LeadAttribution`** row stores the referral URL, first-touch data, the agreement in force, `attributionWindowDays`, `protectedUntil` and the consent text version. It also stores a **SHA-256 evidence hash** over a canonical JSON of those fields.
- The **window is not hard-coded.** It comes from the partner's active agreement, falling back to the admin setting `attribution.defaultWindowDays`. Options such as 30/60/90/180/365 are configurable.
- **Dedupe:** the same customer and property while a lead is open is recorded as `REPEAT_INQUIRY` on the existing lead.
- At deal close, `withinAttributionWindow` is computed and stored. A deal closed outside the window still creates the commission, but with a note telling finance to confirm eligibility.
- **Evidence page** (`/admin/leads/[id]/evidence`) is printable. It recomputes the hash to prove integrity and lists the chronology.

## 9. Commission model

- Terms resolve as **property override → partner agreement in force at closing**. With no terms, **closing is blocked**, so revenue is never silently lost.
- `PERCENTAGE` uses basis points with half-up rounding to the kobo (2% of ₦150,000,000 = ₦3,000,000). `FIXED` is an amount in kobo.
- Lifecycle: `PENDING` (on close) → `DUE` (automatically when `dueDate` passes, or manually) → `INVOICED` → `PARTIALLY_PAID` → `PAID`, with `DISPUTED` and `WAIVED` reachable through validated transitions.
- Payments are idempotent by bank reference and use a row lock (`SELECT … FOR UPDATE`) to avoid double counting.
- Lead status mirrors the commission (`COMMISSION_PENDING/DUE/PAID`, `DISPUTED`). These statuses can't be set by hand.
- **Separation of money:** commission is YAKI revenue owed by the partner. The customer's property payment never touches the platform; online payments are a disabled feature flag.

## 10. Security model

- **Auth:** scrypt password hashing (Node built-in). Sessions are random 256-bit tokens, stored hashed, in httpOnly + SameSite=Lax (+Secure in prod) cookies. Login timing is equalised for unknown emails, errors are generic, and suspension kills all sessions.
- **Authorization:** central permission catalogue plus `assertPermission` / `assertPartnerScope` in every service. Partners get `NOT_FOUND`, not `FORBIDDEN`, for other tenants' leads, so existence isn't leaked.
- **Privacy by default:** customer contact details are hidden from partners until introduction. Internal notes are never returned to partners. Exact addresses are private by default, and maps show approximate neighbourhoods.
- **Input validation:** zod on every service input. Unknown keys are stripped, which blocks mass assignment of `status`, `partnerId`, `featured`, commission fields and similar.
- **Uploads:** type detected by magic bytes (not extension), size limits, random storage keys, private documents served only through an authorised route with `no-store`.
- **Rate limiting:** Postgres-backed fixed window on login (per IP and per email), registration, enquiries, partner applications, newsletter and uploads.
- **Spam:** honeypot fields, plus a repeated-phone risk rule.
- **Headers:** HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy; `poweredByHeader` is off.
- **Open-redirect safe** `?next=` handling, which also stops role-crossing redirects.
- **Audit:** `AuditLog` for approvals, rejections, status changes, commission changes, payments, reassignments, verification, settings and user status. Secrets are redacted.

## 11. Compliance considerations (configurable, not asserted)

- YAKI is positioned as a **marketplace/referral platform**, not an owner, seller or agent, in the copy, terms templates and footer disclosure (editable in settings).
- Legal pages are **templates** with a visible "draft for legal review" notice until an admin ticks `legal.reviewedByCounsel`.
- Feature flags default **off** for anything with regulatory implications: online payments, WhatsApp Business API, public reviews, exact addresses.
- Verification badges are created only by staff, are dated and expire, and carry precise public scope text. **No badge implies title or legal verification.**
- Demo content is flagged `isDemo`, labelled DEMO on every surface and excluded from the sitemap. Demo pages are `noindex`.
- Data minimisation: no raw IPs stored, hashed visitor IDs, approximate locations, partner access to client data only after introduction.

## 12. SEO strategy

Dynamic metadata per page, canonical URLs, Open Graph and Twitter cards, and JSON-LD (`Organization`, `RealEstateListing`, `BreadcrumbList`, `Article`, `FAQPage`). Other pieces:
- Dynamic `sitemap.xml` covering listings, locations, partners and articles, with demo content excluded.
- `robots.txt` blocks private areas.
- SEO URLs: `/properties/lagos/lekki/<slug>`, `/properties/lagos/lekki` (live landing pages), `/locations/lagos/lekki`, `/partners/<slug>`, `/journal/<slug>`.
- Filters are GET parameters, so every search is linkable.

## 13. Mobile strategy

Mobile-first layouts, plus:
- a bottom navigation bar (Home, Search, Saved, Advisor/WhatsApp, Account)
- full-screen mobile filters
- a swipeable scroll-snap gallery
- a sticky "Request a viewing" and WhatsApp bar on property pages
- 44px touch targets
- `tel:`, `inputMode` and autocomplete hints on forms
- dashboard tabs that scroll horizontally
- `env(safe-area-inset-bottom)` padding.

## 14. Scalability strategy

- Indexed, paginated queries, with search through a single `buildWhere` (12 per page, map view capped at 60).
- Beyond roughly 5–10k listings, move free text to Postgres FTS (`tsvector` + GIN). The query engine is the only place that changes.
- The outbox pattern for notifications keeps request latency flat. Jobs are idempotent and can scale out.
- Stateless app servers: sessions and rate limits are in Postgres, so you can run N instances behind a load balancer. Swap rate limiting to Redis only when traffic warrants it.
- Images use `next/image` (AVIF/WebP, responsive sizes, lazy loading). Production should use object storage and a CDN through the storage driver.
- Locations are a tree with inactive expansion markets already seeded (Rivers, Oyo, Edo, Enugu, Kano, Akwa Ibom).

## 15. Folder structure

```
prisma/              schema, migrations, seed (+ seed-data/)
src/app/(site)/      public pages            src/app/(auth)/   login, register, forbidden
src/app/account/     customer area           src/app/partner/  partner portal
src/app/admin/       admin console           src/app/api/      health, jobs, documents
src/app/actions/     server actions (thin)   src/app/media/    public upload serving
src/components/      ui/ layout/ property/ forms/ dashboard/ admin/
src/content/         legal templates, FAQ
src/lib/             money, phone, ids, slug, formatting (pure, shared)
src/server/          db, auth/, authz/, domain/, services/, search/, notifications/, storage/, queries/, validation/
tests/               unit/ + integration/ (real PostgreSQL)
docs/                this file, README-level guides
```

## 16. API architecture

- **Server Actions** for all mutations (`src/app/actions/{public,account,partner,admin}.ts`). They are CSRF-protected by Next's origin checks, validated by zod in services, and return a typed `ActionResult` (`{ok,data,message}` or `{ok:false,error,code,fieldErrors,requestId}`).
- **Route handlers**:
  - `GET /api/health`
  - `POST /api/jobs` (Bearer `CRON_SECRET`)
  - `GET /api/documents/:id` (authorised private download)
  - `GET /media/public/...` (public listing photos)
  - `sitemap.xml`, `robots.txt`
- **Future public/mobile API:** services are transport-agnostic, so adding `/api/v1/*` REST handlers (or tRPC) means writing thin adapters, not duplicating logic.

## 17. Database schema

See `prisma/schema.prisma` (commented) and the initial migration `prisma/migrations/*_init/migration.sql`.

## 18. Key workflows (where to find them)

| Workflow | Service | Test |
|---|---|---|
| Partner application → approval | `services/partners.ts` | business-loop 1–3 |
| Listing submit → review → publish | `services/properties.ts` | business-loop 4–5, security |
| Search (filters + NL) | `search/engine.ts`, `search/interpreter.ts` | unit/search, business-loop 5 |
| Enquiry → lead + attribution + notify | `services/leads.ts#createInquiry` | business-loop 6–8, 18 |
| Introduction & masking | `services/leads.ts` | business-loop 8–10, security |
| Viewing / offer / deal | `services/{viewings,offers,deals}.ts` | business-loop 11–13 |
| Commission calc → due → paid | `domain/commission.ts`, `services/commissions.ts` | unit/domain, business-loop 13–15, 17 |
| Automations | `services/jobs.ts` | business-loop 14 |

---

## AI-ready seams (not marketing features)

- **Search:** `QueryInterpreter` interface. The rule-based interpreter ships today. An LLM implementation would return the same zod-validated `SearchFilters`, so URLs, alerts and the engine are unchanged. Use a small, fast model with structured output; cache by normalized query; fall back to rules on timeout.
- **Lead qualification / follow-up suggestions:** read `LeadEvent` timelines and suggest the next action to staff. Suggestions only, never automatic messages.
- **Listing descriptions:** draft-assist in the property form, with partner and staff review unchanged.

## Payment architecture (future)

`features.onlinePayments` is off. If introduced after legal, financial and provider review, add a `PaymentIntent` model with an explicit `purpose` enum (`RESERVATION`, `SERVICE_FEE`, `REFERRAL_COMMISSION`, `PLATFORM_FEE`) and a provider adapter (e.g. Paystack or Flutterwave). Commission payments would reconcile into the existing `CommissionPayment`. Customer property purchase payments stay out of scope by design.
