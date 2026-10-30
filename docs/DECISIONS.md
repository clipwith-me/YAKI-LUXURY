# Product decisions & assumptions

## Assumptions that need your confirmation

| # | Assumption | Why it matters | Where to change it |
|---|---|---|---|
| A1 | YAKI operates as a **marketplace/referral platform** and is not a licensed estate agent. All copy reflects this. | Licensing and consumer-protection exposure | Footer disclosure in Settings; legal templates in `src/content/legal.ts` |
| A2 | **Customer details are shared with the partner only after staff introduce the client.** | Protects privacy and YAKI's referral position, but adds one staff step per lead | `introduceLeadToPartner` in `services/leads.ts`. Could be automated per partner later. |
| A3 | Commission basis = **final transaction price** recorded at deal close. | Rentals may use a different basis (e.g. first-year rent) | Use a fixed fee or a property-level override, or extend `closeDeal` |
| A4 | Only **one active agreement per partner** at a time. Properties can override terms. | Keeps commission resolution unambiguous | `createAgreement` / `setAgreementStatus` |
| A5 | Closing a deal **after** the protection window still creates a commission, flagged for finance to confirm. | Contract interpretation varies | `closeDeal` in `services/deals.ts` |
| A6 | Default referral window: **90 days**, configurable. | Contractual | Admin → Settings, and per agreement |
| A7 | Brand assets (logo, photography) are interim: a wordmark and Unsplash demo images. | Brand identity workstream | `src/components/layout/logo.tsx`, seed images |
| A8 | Advisor WhatsApp number is unset, so WhatsApp buttons stay hidden until configured. | No invented contact details | Admin → Settings |

## Decisions

- **Modular monolith (Next.js + Postgres).** Fastest time to market and cheapest to run. Services are transport-agnostic, so they can be split out later if needed.
- **Server Actions over a REST layer** for the web UI. Less code, built-in CSRF protection and typed results. A REST/mobile API can wrap the same services.
- **No auth library.** Session auth is about 150 lines on Node's built-in crypto (scrypt, random tokens, hashed at rest). That keeps the dependency count low and behaviour easy to audit. Password reset and 2FA for staff are the next auth features.
- **Postgres-backed rate limiting and notification outbox.** No Redis or queue to run at MVP. Swap when traffic demands.
- **Rule-based natural-language search** behind the `QueryInterpreter` interface. It is free, instant and deterministic. An LLM implementation can be added without touching URLs, alerts or the engine.
- **Comparisons use the browser's localStorage** (up to 4) rather than a server table. That works for guests without sign-up friction.
- **Lead-scoped timeline instead of free-form messaging.** Partner updates and shared staff notes live on the lead timeline. The `Message` table exists for a future threaded inbox.
- **Testimonials only come from moderated, approved reviews.** Until real reviews exist, the homepage shows YAKI's commitments instead of fabricated quotes.
- **Demo data is fictional, labelled and `noindex`.** No demo leads, deals or commissions are seeded, so dashboards start empty rather than showing invented numbers.

## Known gaps / next steps

1. Self-service password reset (email provider needed) and 2FA for staff.
2. S3-compatible storage driver, plus image resizing for partner uploads.
3. Real email/SMS/WhatsApp providers.
4. UI for editing locations and enabling expansion markets (currently seeded; toggle via DB).
5. Customer review submission UI (service and moderation exist; disabled by default).
6. Postgres full-text search when inventory grows beyond a few thousand listings.
7. Playwright E2E suite in CI (the business loop has been run manually in a browser against the production build).
