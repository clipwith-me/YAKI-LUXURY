# YAKI'S LUXE HOMES — project notes for Claude

Premium real-estate marketplace + referral platform (Nigeria). Read `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` first.

## Non-negotiables
- YAKI is a marketplace/referral platform: never claim it owns, sells or legally represents properties, or holds a licence.
- Never invent verification, partnerships, legal compliance, transaction data, testimonials or metrics. Empty states over fake data; demo content must be `isDemo` and labelled DEMO.
- Badges come only from ACTIVE, unexpired `VerificationRecord`s created by staff. No badge implies title/legal verification.
- Customer purchase money never flows through the platform. Commission (YAKI revenue) is separate.
- Features with regulatory implications stay behind settings flags (default off).

## Engineering rules
- Business logic lives in `src/server/services` (+ pure `src/server/domain`). Pages and actions stay thin.
- Every service takes an `Actor` and authorises through `src/server/authz` — no scattered role checks.
- Partner data is always scoped by `partnerId`; partners never see client details before introduction or internal notes.
- Money is BigInt kobo; rates are integer bps. Validate inputs with zod. Every schema change gets a migration.
- Audit sensitive actions with `audit()`. Never log secrets, passwords, tokens or raw IPs.
- Before committing: `npm run lint && npm run typecheck && npm test && npm run build`.
