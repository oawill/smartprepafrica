# Migration Plan (v2) — revised against actual codebase state

Supersedes the 2026-09-08 plan. Because most of the original Phase
2/3/5–12 scope is already shipped (see `docs/audit.md` §10), this plan
only sequences the work that's genuinely still missing, plus the specific
gaps called out in the audit. Phase numbers below are this plan's own
numbering — they don't map 1:1 to the brief's numbering, since several of
the brief's phases collapse into "close a gap" rather than "build from
zero."

## Already done — no phase needed

Country/exam abstraction core, full Course→Module→Lesson→Quiz/Certificate
hierarchy, subscription payments (Paystack), instructor studio + payouts,
school dashboard (rosters/bulk-enrol/benchmarks/exports) + bulk seat
licensing, the two-way Prep↔Learning loop, Discussions + Ask a tutor,
Gamification. These are live in production today under the names/shapes
recorded in the audit.

## Revised Phase 1 — Naming, routes, and Skills-vertical archival

- Rename `/educom` → `/learn`. Given there are no `route.ts` API
  consumers under `/educom` (confirmed in the audit — everything is pages
  + Server Actions), the redirect surface is purely browser navigation:
  add a `redirects()` block in `next.config` (or Next 16 middleware) for
  every existing `/educom/...` path shape, preserving all query params
  (`?state=`, `?subjectId=`, etc.) via wildcard capture, then physically
  move the 35 files that reference "educom" to their `/learn` equivalents.
  Write redirect tests asserting: old catalog/course/search/rankings/
  schools/teachers URLs 301 to their `/learn` equivalent with query params
  intact, and that search-engine-indexed URLs (course detail, school
  detail) keep resolving.
- Add `Course.archived: Boolean @default(false)` (a real, additive schema
  change — no existing archive concept to repurpose, confirmed in the
  audit). Set it on the two Skills courses. Catalog/search/rankings
  queries add `archived: false`; the course-detail and lesson pages do
  **not** filter on it, so an already-enrolled learner's URL and progress
  keep working exactly as today. No CourseEnrollment/LessonProgress rows
  are touched.
- Decide and implement the Class/Course/Programme vocabulary. `Class`
  (single live session) and `Course` (self-paced, multi-module) already
  exist in substance — `LiveClass` and `Course` respectively — this is a
  renaming/relabeling exercise in UI copy, not new schema. `Programme`
  (a bundle of courses ending in a certificate) is genuinely new: needs a
  `Programme` model with a `courses` join and its own certificate-issuance
  rule (all member courses completed → programme certificate). Scope
  question for you: does Programme ship in this phase, or is it deferred
  to its own later phase once Class/Course renaming and the `/learn` move
  are stable? Given it's a new content type teachers/schools need to
  author, not just a rename, I'd recommend deferring it — flagging here
  rather than assuming.

## Revised Phase 2 — Close the country-abstraction gaps

- Wire `CountryPlanPrice` into checkout for real (it's dormant today —
  `resolvePlanPrice()` already checks it first, so this is "seed real
  override rows + admin UI to manage them," not new plumbing).
- Fix `resolvePlanPrice()`'s currency fallback: today it silently returns
  `"NGN"` for any unconfigured plan/country. Make the fallback explicit
  (return `null`/throw a clear "not priced for this country" rather than a
  silently-wrong currency) so a future country never gets charged in the
  wrong currency by accident.
- Add `User.phone: String?` (E.164) — additive, nullable, no existing data
  migration needed since no student-facing phone field exists today.
- Fix `src/lib/teachers/compensation.ts`'s hardcoded `₦` to route through
  `formatMoney()`.
- `Locale`/i18n: given zero i18n exists today (no library, no table, all
  copy hardcoded English), this is a genuinely large, separate effort —
  recommend scoping it as its own later phase (likely alongside or after
  Ghana/Kenya actually going live) rather than bundling into this
  "close the gaps" phase, since extracting every hardcoded string is a
  full pass over the UI, not a schema change.

## Revised Phase 3 — Student intake (the three doors)

The single largest genuinely-new body of work in this brief. Today, every
account requires email + bcrypt password — no phone signup, no OTP
(email-only, password-reset-only), no join codes, no PIN, no shared-device
profile switching. This phase needs its own dedicated plan-mode pass (real
design decisions: does phone-first signup replace or sit alongside email;
what SMS/WhatsApp provider; how does a `sessionVersion`-based JWT session
interact with PIN-based shared-device switching) rather than being
scoped fully here. Suggest treating Door 1 (phone+OTP self-signup), Door 2
(school join-code), and Door 3 (sponsor prepaid codes reusing Door 2's
redemption flow) as three sequential sub-phases under this one heading,
each with its own plan/approval cycle.

## Revised Phase 4 — Payment provider abstraction

Extract a `PaymentProvider` interface (`initializeTransaction`,
`verifyTransaction`, webhook signature verification) that
`src/lib/paystack.ts`'s current implementation becomes one concrete
implementation of; update its **three** call sites (subscription
checkout, school license checkout, international exam checkout — two of
which didn't exist at the time of the original brief) to go through the
interface. Add a Flutterwave implementation behind the same interface.
M-Pesa/MoMo become "add a fourth implementation" once a real country
needs them — no schema change required beyond what's already on
`Payment`/`SchoolLicensePurchase`/`InternationalExamPurchase` (`provider`
is already a plain string column on all three).

## Revised Phase 5 — Certificates: short verification code

`/certificates/[certificateId]` already works and is already public — add
a short, human-shareable `Certificate.verificationCode` (e.g.
`CERT-XXXXXX`) alongside the existing cuid-keyed URL, a `/verify/[code]`
route resolving by that code, and display the exam board + country on the
certificate (both already reachable via existing relations, not new
data). Small, additive, no risk to the existing URL.

## Revised Phase 6 — Mobile-first / low-bandwidth / offline

Audited 2026-09-09 (`docs/audit.md` §11): zero PWA/offline
infrastructure and zero low-bandwidth accommodation exist today — this
is unbuilt, not partially built. Genuinely several independent pieces
of work, not one phase; proposed as sub-phases, same shape as Revised
Phase 3's three doors, each with its own plan/approval cycle:

- **6a — PWA installability.** `manifest.json` + icons + `themeColor` +
  `metadata.manifest` in `src/app/layout.tsx`. Small, additive, no
  runtime behavior change for anyone who doesn't install it — the
  natural first slice since it unblocks nothing else and risks nothing.
- **6b — Image optimization.** Add a `next.config.ts` `images` block
  (remote patterns + AVIF/WebP `formats`), then convert the handful of
  real remote-image call sites (confirmed: SAT drill question figures
  in `sat-drill-runner.tsx`, plus any others a full sweep turns up) from
  raw `<img>` to `next/image`. Targeted — only 2 files use `next/image`
  today, so this is "wire up the config + fix the sites that actually
  matter," not a blanket rewrite.
- **6c — Lesson-player responsive pass.** `src/app/learn/[courseId]/
  lessons/[lessonId]/page.tsx` has zero responsive-prefix classes
  despite being the highest-stakes mobile screen in the app (video +
  transcript + quiz on one page). Needs a real visual check on a
  narrow viewport before writing fixes, not a blind class-adding pass.
- **6d — Offline resilience.** The largest, most architecturally risky
  piece: a service worker, an offline fallback page/state, and a real
  caching strategy (candidate: Next 16's `"use cache"`/`cacheLife` for
  server-rendered content, a SW cache for the app shell + recently
  viewed lesson content). Needs its own dedicated design pass — service
  workers interact with Vercel's Fluid Compute/caching model in ways
  that need care, and "what should actually work offline" (browse
  already-downloaded lesson content? resume a practice session
  mid-flight?) is a product decision, not just an engineering one.
- **Not part of this phase** (flagged, not scoped): password reset has
  zero fallback when email isn't configured/deliverable
  (`docs/audit.md` §11's last paragraph), and phone-only (Door 1)
  accounts have no password to reset in the first place. This is an
  auth-completeness gap, not a mobile/offline one — worth its own
  future phase (phone-based account recovery) rather than folding into
  Phase 6.

No decision made yet on sequencing 6a–6d or which to build first —
flagging here for your call rather than assuming.

---

## Decisions (resolved 2026-09-09)

1. **Redirect mechanism** — middleware catch-all. One rule matches any
   `/educom/*` path, 301s to the same path under `/learn/*`, preserving
   the full pathname tail and every query param automatically. No
   per-route-shape maintenance as new routes are added under `/learn`.
2. **Archived-course visibility** — 404 for a non-enrolled visitor.
   Matches the brief's literal wording; an enrolled learner still
   resolves normally since the page's own enrollment check runs first
   and short-circuits before any archived-status check would 404 them.
3. **Programme timing** — deferred to its own later phase. Revised
   Phase 1 ships only the `/learn` rename, Skills-vertical archival, and
   Class/Course relabeling (both already exist in substance as
   `LiveClass`/`Course` — this is copy/vocabulary, not new schema).

Ready to start **Revised Phase 1** — see plan mode for the concrete
implementation plan.
