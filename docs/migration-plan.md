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

Not audited in depth this pass (no PWA manifest or offline-cache code
was found in either audit sweep, but a dedicated audit pass would be
needed before planning this phase properly — recommend a short, focused
audit of the current mobile experience and bundle size before writing a
real plan here, rather than guessing at scope now).

---

## Open questions before Revised Phase 1 starts

1. **Redirect mechanism** — Next.js `redirects()` config (simple,
   edge-cached, but requires a fixed list/pattern per route shape) vs. a
   middleware-based catch-all (more flexible for the dynamic `[courseId]`/
   `[lessonId]` segments, slightly more runtime cost per request). Given
   every `/educom` route has a `[courseId]`/`[lessonId]`-shaped Next.js
   dynamic segment, a middleware rewrite is likely cleaner than enumerating
   static redirect patterns — recommend confirming this before implementation.
2. **Skills vertical archival** — should `archived` courses stay
   discoverable via direct link for a NON-enrolled visitor who has an old
   bookmark (e.g. shared on social media before archival), or only for
   already-enrolled learners? The brief says "keep their URLs resolving
   for enrolled learners" specifically — confirming that a non-enrolled
   visitor hitting an archived course URL should see a clear "this course
   is no longer offered" state rather than a 404, or ideally a 404.
3. **Programme timing** — deferred to its own phase, per Revised Phase 1
   above — confirm.

Ready to start **Revised Phase 1** on your go-ahead, in plan mode as usual.
