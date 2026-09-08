# Phase 0 Audit — Coursera-grade Learning Platform

Audited 2026-09-08 against `master` @ `02f402e`. Every claim below was verified
by reading the actual file/line, or by running a real command against the
local dev database — nothing here is inferred from naming conventions alone.

**Headline finding, before the details: significantly more of the requested
Phase 1 "Country abstraction layer" already exists than the brief assumed.**
`Country`, `ExamBody`, `Exam`, `CountryExam`, `CountryExamSubject`,
`ExamTopic`, and `CountryPlanPrice` are all live in the schema today, and the
Course→Module→Lesson→Quiz→Certificate hierarchy is not a gap either — it's
built and has real data. The actual gaps are narrower and different in shape
than "Phase 1" describes. See §7 below and `docs/migration-plan.md` for what
that changes about the plan.

---

## 1. Prisma schema map — Course modelling

`Course` (`prisma/schema.prisma:1088-1143`) already sits inside a working
hierarchy, not a flat single-session record:

```
Course → Module (:1169) → Lesson (:1203, type VIDEO|TEXT|QUIZ)
                              → LessonChapter (:1261, video chapters)
                              → QuizQuestion (:1279)
                              → LessonCheckpointResponse (:1305, append-only answer log)
Course → CourseTopic (:1183, a parallel curriculum-browse grouping, deliberately distinct from Module)
Course → CourseEnrollment (:1324) → LessonProgress (:1339, per-lesson resume/completion/score)
Course → Assignment (:1358) → AssignmentSubmission (:1370, freeform, not auto-graded)
Course → Certificate (:1385, minimal: user+course+issuedAt+certUrl, no criteria/template fields)
Course → CourseReview (:1145), LiveClass (:1158, a Lesson-adjacent live-session model)
```

- **`MEDIUM`** → `Difficulty` enum (`:987-991`, `EASY|MEDIUM|HARD`), nullable on `Course.difficulty` (`:1109`).
- **`60 min`** → `Course.estimatedMinutes Int?` (`:1110`), plain nullable minutes. No aggregate "total course duration" is computed/stored anywhere — would need to be summed from `Lesson.durationSeconds` at query time, or cached.
- **`Free`** → `Course.priceKobo Int?` (`:1113`), comment: `null or 0 means free`. **No `isFree` boolean** — paid-ness is implicit from a nullable price field.
- **Learner count** → **no denormalized counter**. Derived by counting `CourseEnrollment` rows (`:1324-1337`, unique on `[userId, courseId]`). Any "N learners" display must `COUNT(*)` or Prisma `_count` at read time.
- **`School`** (`:271-314`) — `name, address, state? (plain string), country (plain string, default "Nigeria"), countryRef Country?/countryId (nullable relation already exists alongside the plain string), verified, status: SchoolStatus`. Relations to `admins[]`, `students[]`, `teachers[]`, `classes[]`, `courses[]`.
- **`Instructor`** = `TeacherProfile` (`:324-338`) — 1:1 with `User`, optional `School`, `bio/photoUrl/qualifications/yearsExperience`, authors `courses Course[]`, teaches `classes Class[]`, has `followers TeacherFollow[]`.
- Live data (`prisma.course.count()` etc., run against local dev DB): **13 courses, 11 published, 15 modules, 23 lessons, 13 enrollments, 4 certificates.** Per-course module counts: 11 of 13 courses have exactly 1 module (matches the brief's "single 45–90 min session" framing) — but **2 already don't**: "Financial Literacy Basics" (3 modules) and "Introduction to Coding with Python" (2 modules). So the single-module pattern is the *majority* case today, not universal — multi-module courses already exist and render correctly.

**Every other model with a FK into Course/School/TeacherProfile** (for migration blast-radius): `CourseReview`, `LiveClass`, `Module`, `CourseTopic`, `CourseEnrollment`, `Assignment`, `Certificate`, `ClassCourseAssignment`, `AiConversation` (nullable `courseId`) into Course; `SchoolInvitation`, `StudentProfile`, `TeacherProfile`, `Class`, `Course`, `SponsorshipProgram`, `PartnerSchoolLead`, `PartnerSchoolAttribution`, `PartnerSchoolDispute`, plus `User.schoolAdminOf` into School; `TeacherFollow`, `Course.teacherId`, `Class.teachers[]` into TeacherProfile.

**Route surface** under `src/app/educom/`: `page.tsx`, `layout.tsx`, `[courseId]/page.tsx`, `[courseId]/lessons/[lessonId]/page.tsx`, `class/[classLevelId]/page.tsx`, `rankings/page.tsx`, `schools/page.tsx`, `schools/[schoolId]/page.tsx`, `search/page.tsx`, `teachers/[teacherId]/page.tsx`.

**Thin spots to actually design for** (not "build from scratch"): `Certificate` has no completion-criteria/template/verification-code fields; no cached course-duration/enrollment-count; `Assignment` is ungraded freeform text, not a scored `Assessment`; `CourseTopic` vs `Module` vs plain-string `Lesson.topic` are three deliberately-uncollapsed groupings (comments at `:1179-1182`, `:1212-1216`) that a hierarchy redesign needs to either respect or consciously collapse.

---

## 2. Auth

- **Provider**: Credentials only (email + password via bcrypt), `src/lib/auth.ts:13-71`. No OAuth (no Google, etc.) actually wired in — `PrismaAdapter` is present but inert under JWT sessions. *(Note: an earlier session in this repo's history added `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` to `.env`, but no Google provider is registered in `auth.ts` today — those env vars are currently unused by auth.)*
- **Session strategy**: JWT (`session: { strategy: "jwt" }`, `auth.ts:11`), with per-request DB revalidation in the `jwt` callback (`:73-100`) — re-checks `status`/`sessionVersion`/`role`/`adminRole` on every request and returns `null` (forcing sign-out) if the account isn't `ACTIVE` or `sessionVersion` no longer matches. This is how forced logout works despite JWT-not-DB sessions.
- **Identifier**: `User.email String @unique`, required (`schema.prisma:49`) — the sole login identifier. `studentNumber String? @unique` (`:80`) is a secondary nullable display reference, not used for auth.
- **Phone**: **No phone field exists on `User` at all.** Zero E.164 or any other format assumption to migrate — this is a green-field addition if Phase 1+ wants SMS/WhatsApp OTP.
- **Role model**: `enum Role` (`:12-20`) = `STUDENT|PARENT|SCHOOL_ADMIN|TEACHER|SPONSOR|PARTNER|ADMIN`. Dual-modeled: `User.role` is the single *active* role; `UserRole` (`:171-179`, unique `[userId, role]`) is the full *entitled* set — a second row is what shows "Switch Workspace" UI, admin-grant-only. Separate `AdminRole` enum (`:26-37`, 10 values) nested under `role === ADMIN`, not DB-enforced (comment-only convention at `:24-25`).
- **Country on User**: `User.countryId String?` (`:158`) — nullable, no schema default. Comment states pre-existing rows were backfilled to Nigeria via a one-off script.
- **Registration country resolution**: no geo-detection (no IP/geolocation lookup anywhere, confirmed by grep). `src/app/api/register/route.ts:72-79` falls back to `prisma.country.findFirst({ where: { code: "NG" } })` in application code when the client doesn't send a valid `ACTIVE` country code. This is a legitimate, already-abstracted fallback (reads from the `Country` table, not a literal object) — just currently always resolves to Nigeria in practice since no other country is `ACTIVE` yet.

---

## 3. Payments — promise vs. reality

- **`/pricing` promises** (`src/app/pricing/page.tsx`): FREE/BASIC/PREMIUM/PRO plans, SCHOOL as "Talk to Us" (no self-serve checkout), TOEFL/SAT as one-time purchases. Payment-method copy (appears twice, `:43` and `:315-318`): *"Payments are processed securely by Paystack. Cards, bank transfer, and USSD are supported."* No Flutterwave or mobile-money mention anywhere on the page.
- **Paystack integration is real**, not a stub — `src/lib/paystack.ts` (227 lines) makes live HTTP calls to `https://api.paystack.co`: `initializeTransaction`, `verifyTransaction`, `activateSubscriptionForReference` (idempotent, creates `Subscription` + flips `Payment` to `SUCCESS`), `reversePaymentForReference` (refund/chargeback path), `initiateSubscriptionCheckout`.
- **Flutterwave: zero references anywhere in the repo.** Confirmed by repo-wide case-insensitive grep across `src/` and `prisma/`.
- **M-Pesa / mobile money: zero references anywhere.** Same grep result.
- **Payment models**: `CountryPlanPrice` (`:509-520`, dormant per-country per-plan override, unique `[countryId, plan]`), `Subscription` (`:1441-1460`, plan/interval/status/expiresAt, supports parent-buys-for-child via `purchasedByUserId`), `Payment` (`:1468-1492`, amountKobo/currency/provider(String)/reference/status/kind CHARGE|REFUND), `InternationalExamPurchase` (`:2927-2941`, one-time TOEFL/SAT purchases, own provider/reference/status).
- **Webhook**: `src/app/api/webhooks/paystack/route.ts` — real HMAC-SHA512 signature verification against the raw body (`:6-21`), though using plain `!==` string comparison rather than a timing-safe compare (minor hardening item). On `charge.success`, calls both `activateSubscriptionForReference` and `activateInternationalExamPurchaseForReference` unconditionally (each is a documented no-op if the reference doesn't belong to it). Refund/dispute events call `reversePaymentForReference` — comment notes this path "was not exercised against a live Paystack event in this environment." The same activation function is *also* called from the browser-redirect callback route (`src/app/api/payments/callback/route.ts`), guarded by an idempotency check.
- **Learning (educom) is not paywalled at all today.** `Course.priceKobo` is display/filter-only. `enrollInCourse()` (`src/app/educom/actions.ts:29-40`) upserts a `CourseEnrollment` for any authenticated user + any `courseId`, with **no price check whatsoever** — directly callable, not just UI-gated. The course detail page shows a "Paid course checkout isn't available yet" message and hides the enroll button for `isPaid` courses, but that's UI-only; the Server Action itself has no guard. **This is the actual blocker for Phase 3 payments**, not missing provider integration — the enrollment write path needs a price/entitlement check added regardless of which provider is behind it.
- **No `PaymentProvider` interface exists.** Paystack functions are imported and called directly from 5 files (`api/payments/callback`, `api/webhooks/paystack`, `dashboard/parent/actions.ts`, `pricing/actions.ts`, `lib/international-exams/checkout-service.ts`). `Payment.provider`/`InternationalExamPurchase.provider` are already plain `String` (not an enum) and always `"paystack"` today — the field itself doesn't need a migration to add Flutterwave, just an actual abstraction layer and branching logic.

---

## 4. Prep question bank & AI Coach — reuse potential for Learning

- **`Question`** (`:861-925`) is hard-tied to `exam: ExamType` (required, only 4 values: WAEC/NECO/UTME/POST_UTME) and `subjectId` (required FK) — **cannot be reused generically** for a Learning quiz without either faking an ExamType or loosening the field. This is presumably why Learning built its own **separate, parallel model family**:

  | | Prep | Learning |
  |---|---|---|
  | Question bank | `Question` (exam+subject required) | `QuizQuestion` (belongs to a `Lesson`) |
  | Session/attempt | `ExamAttempt` → `QuestionResponse` | none — `LessonProgress.score` per lesson instead |
  | Per-item log | `QuestionResponse` (keyed to `ExamAttempt`) | `LessonCheckpointResponse` (keyed to user+question directly, no attempt/session entity) |

  There is **no shared Quiz/Assessment/Attempt abstraction** — this is an explicit, commented design choice in the schema (`:1029`, `:1056-1060`), not an oversight. A unified "Course quiz uses the same attempt model as an exam drill" design would be new work, not a reuse of something half-built.

- **Mastery tracking is already shared and generic.** `StudentTopicMastery` (`:1627-1649`) keys on `(userId, subjectId, topic)` where `topic` is a plain string deliberately shared between `Question.topic` and `Lesson.topic`. `src/lib/ai/mastery-service.ts`'s `recordTopicAttempt` is called from **both** `src/app/practice/actions.ts:190` (Prep) and `src/app/educom/lesson-player-actions.ts:101` / `src/app/educom/actions.ts:134-138` (Learning). This already works today — no schema change needed to extend it, only discipline about keeping `topic` strings aligned across the two content types. There's no Module-level rollup though, only flat per-topic EMA.

- **AI Coach is built on Claude via the Vercel AI SDK** (`@ai-sdk/anthropic`, model `claude-sonnet-5` by default, `src/lib/ai/provider.ts`), streamed via `streamText`. **`AiConversation` already has first-class, nullable `courseId` AND `lessonId` FKs** alongside `subjectId` (`:1586-1610`) — the Learning hook is not partial, it's built. `buildCoachContext` (`src/lib/ai/context-builder.ts:71-259`) already assembles a single context payload spanning **both** products in one call: Prep's `recentAttempts`/`weakTopics` from `ExamAttempt`/`StudentTopicMastery`, and Learning's `lesson`/`course`/`chapter` context + `recentCheckpointMistakes` when a `lessonId` is passed.

- **The "weak Prep topic → recommend a Learning lesson" loop already exists and works today**: `getTodaysRecommendation()` (`src/lib/ai/mastery-service.ts:136-158`) finds the student's weakest `StudentTopicMastery` row and looks up a matching *published* `Lesson` by exact `topic` string match, surfaced on the student dashboard. **The reverse direction — "unlock a Prep drill after completing a Learning module" — does not exist** (confirmed: zero cross-imports from `src/app/practice/**`/`src/lib/practice/**` into anything module-completion-related).

- **`Subject` is a single global flat table**, `name String @unique` (`:842-859`) — "Maths under WAEC" and "Maths under UTME" are literally the same row by design (comment `:476-478` confirms this is intentional so Ghana/WASSCE reuses the same `Subject` Nigeria uses). Board-specific scoping is layered on separately via `CountryExamSubject`/`ExamTopic` (see §7), not on `Subject` itself. **Learning's `Course.subjectId` already points at this same shared table** — Learning can join into Prep's exact Subject taxonomy with zero schema change.

---

## 5. Hardcoded Nigeria assumptions — full inventory

Grouped by real-fix-needed vs. legitimate-default. File:line citations throughout; the highest-priority items are called out first.

**Real hardcodes, ranked by how much they'll bite:**

1. **State list**: `src/lib/nigerian-states.ts` (37 Nigerian states/FCT, canonical source), consumed by `src/app/dashboard/school/page.tsx:18,282`, `src/app/educom/schools/page.tsx:3,55`, `src/app/educom/search/page.tsx:3,13-18`. **A second, independent, out-of-sync literal list** also exists: `src/app/page.tsx:18` (`discoveryStates`, only 6 of the 37). Underlying data model: `School.state` is a **plain nullable string** with no relational equivalent — `School.country` is also a plain string (defaulting to `"Nigeria"`) even though `School.countryRef`/`countryId` (a real `Country` relation) already exists *alongside* it, unused for filtering. This is the single biggest concrete gap for non-Nigeria launch, since Ghana/Kenya/SA don't have Nigerian-style states — needs a `Region` model.
2. **`?state=` URLs**: written by `src/app/page.tsx:255`, read/filtered by `src/app/educom/schools/page.tsx:10-11,17`, string-matched out of free text by `src/app/educom/search/page.tsx:8-18`. These are the URLs the brief requires to keep working via alias.
3. **Compulsory-subject rule hardcoded to UTME**: `src/lib/practice/exam-profile-service.ts:4-10` — `getCompulsorySubjectNames(exam)` returns `["English Language"]` only for literal `"UTME"`, else `[]`. Comment admits "no such rule exists anywhere else." Needs to read from `CountryExamSubject`/`ExamTopic` (or a new compulsory flag on one of those) instead.
4. **NECO→WAEC profile-reuse hardcode**: `src/app/practice/[exam]/subjects/page.tsx:40-41` — `if (exam === "NECO")` special-cases reusing a WAEC subject profile. Won't generalize to Ghana's WASSCE/BECE relationship without reading from `CountryExam`.
5. **AI Coach system prompt hardcodes Nigeria**: `src/lib/ai/prompt-builder.ts:51` — literally states *"a learning platform for Nigerian secondary school students preparing for WAEC, JAMB (UTME), NECO, and Post-UTME."* This is functional, not cosmetic — it'll misinform the AI tutor for any non-Nigerian student the moment another country goes live.
6. **Four independent Naira-only currency formatters**, none reading `Country.currencySymbol`: `src/lib/plans.ts` (`formatNaira`/`formatMoney`, the latter explicitly `if (currency === "NGN")` branches then falls through generically for everything else), a **duplicate** `formatNaira()` in `src/lib/partners/compensation.ts:106-112`, and two more ad-hoc `Intl.NumberFormat("en-NG", {currency:"NGN"})` copies in `src/app/dashboard/admin/page.tsx:8` and `src/app/dashboard/admin/finance/page.tsx:11-14`. Plus hardcoded `₦` glyphs in JSX at `src/app/pricing/page.tsx:143`, `src/app/dashboard/parent/page.tsx:137`, `src/app/dashboard/partner/payouts/actions.ts:29`, and two admin form labels.
7. **TOEFL/SAT pricing has zero country-override mechanism**: `src/lib/international-exams/pricing.ts` hardcodes kobo prices with no `CountryPlanPrice`-equivalent lookup, unlike subscription plans which at least check for one. A real gap, not just a naming one.
8. **Duplicated hardcoded FX rate**: `NGN_PER_USD = 1600` appears independently in `src/lib/ai/pricing.ts:8-16` and `src/lib/ai/voice/openai-provider.ts:22,53` (AI cost-visibility conversion, admin-only impact but still two copies of a stale-prone constant).
9. **Static WAEC/NECO/UTME nav array**: `src/components/brand/public-header.tsx:16-21`, plus `src/lib/exam-slugs.ts` mapping exam strings to routes. `src/lib/exam-type-mapping.ts:7-16` is the *intended* bridge from the legacy `ExamType` enum to the new `Exam.code` model (WASSCE/SSCE/UTME) — this file is infrastructure to build on, not a hardcode to remove.
10. Marketing/SEO copy hardcoding "Nigeria" throughout (`about`, homepage hero/carousel, `educom` layout metadata, `international-exams/*` page titles) — real, but purely cosmetic/localization debt, not logic.

**Confirmed NOT a problem** (checked and ruled out):
- **SS1/SS2/SS3/JSS**: a proper `Curriculum`/`ClassLevel` model already exists (`schema.prisma:1062-1086`, `ClassLevel` scoped to a `Curriculum` which has its own `country` string). Every SS1-3/JSS hit in `src/` is placeholder/example text on free-text inputs, not a hardcoded enum or array. Only `Curriculum.country` defaults to `"Nigeria"` (same free-text-default pattern as `School.country`).
- **Phone number format**: no field exists to have a hardcoded format in the first place (see §2).
- **Timezone**: no hardcoded `Africa/Lagos` outside the `Country.timezone` field's own doc-comment example.

---

## 6. Test setup, CI, and "green"

- **Runner**: `node:test` via `tsx --test tests/**/*.test.ts` (`package.json:20`) — not Jest, not Vitest. 32 test files across `tests/{ai,content-import,international-exams,password-reset,plans,practice,rbac,sat,toefl}/`, plus a shared `tests/helpers/fixtures.ts`.
- **Convention**: mostly pure-function tests (no I/O). **8 files touch a real database directly** via a shared `PrismaClient` in `tests/helpers/fixtures.ts` — explicitly *"real queries against the local dev database... no test-specific config."* No transaction rollback, no separate test schema; manual `after()` cleanup. Whatever `DATABASE_URL` is in `.env` is what these tests write to and delete from.
- **No `typecheck` npm script exists** — `npx tsc --noEmit` has to be run manually (it *is* clean, see below).
- **No CI at all.** No `.github/workflows`, no `.yml` CI config anywhere in the repo. "Green" today is whatever a human runs locally before pushing to `master` directly (no PR workflow observed either, per this repo's established convention).
- **No Prisma migration history.** `prisma/migrations/` does not exist. The project has been using `prisma db push` exclusively. **There is nothing to `prisma migrate diff` against** — migration history starts from zero the moment the first real migration is written. This directly affects the working agreement's "run `prisma migrate diff` after each phase" instruction: it will show the diff against an empty baseline for the first migration, then real diffs from then on.
- **Actually run, current status (2026-09-08, this session):**
  - `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀` (exit 0). Non-blocking warning: `package.json#prisma` config is deprecated for Prisma 7 (project pinned to 6.19.3; a major version 8.0.0-rc.13 is available but out of scope for this migration).
  - `npx tsc --noEmit` → exit 0, zero output.
  - `npx eslint --quiet` spot-check on `src/lib/plans.ts` + `src/app/pricing/page.tsx` → exit 0, zero output. (Flat config, `eslint.config.mjs`, extends `eslint-config-next`.)
  - **`npm test` → 212/212 passing, 67 suites, 0 failures** (run live this session, not paraphrased from the sub-audit).

**Baseline for "green" before any phase work begins: `prisma validate` clean, `tsc --noEmit` clean, `eslint` clean, `npm test` 212/212.** This is the bar every phase must return to before merging, per the working agreement.

---

## 7. What this means for the Phase 1 brief specifically

The brief asks for new entities: `Country, Region, ExamBoard, GradeLevel, SyllabusTopic, Currency, PriceTier, Locale`. Actual status of each, verified against the live schema and a live query of the dev database:

| Requested entity | Status |
|---|---|
| `Country` | **Already exists**, exactly as specified: `name, code (ISO 3166-1 alpha-2), currency, currencySymbol, flag, status (DRAFT→CONTENT_SETUP→TESTING→ACTIVE→PAUSED), defaultLanguage, timezone`. Live data: Nigeria=`ACTIVE`, Ghana/Sierra Leone/Liberia/The Gambia=`DRAFT`. |
| `ExamBoard` | **Already exists** as `ExamBody` (WAEC/JAMB/NECO as rows, not an enum) → `Exam` (the abstract product: WASSCE/UTME/Post-UTME, one global row shared across countries) → `CountryExam` (the per-country activation join, `DRAFT→...→ACTIVE→PAUSED`, exactly the phased-rollout mechanism the brief describes). |
| `SyllabusTopic` | **Already exists** as `ExamTopic`, scoped via `CountryExamSubject` (country+exam+subject), with the exact "Maths-under-WAEC ≠ Maths-under-KCSE, same Subject row" design the brief asks for (comment `:476-478` states this explicitly). Live data: only 5 `CountryExamSubject` rows and 1 `ExamTopic` row exist — the mechanism is built but **almost entirely unpopulated**, including for Nigeria itself. |
| `Currency` / `PriceTier` | `Country.currency`/`currencySymbol` cover Currency. `CountryPlanPrice` (`:509-520`) is the PriceTier equivalent — already dormant-but-built, per-country per-plan override, unique `[countryId, plan]`. |
| `Region` | **Does not exist.** `School.state` is a plain string; the Nigerian state list is a hardcoded TS array (two independent copies, see §5.1-2). This is a real gap. |
| `GradeLevel` | **Already exists** as `ClassLevel` scoped under `Curriculum` (which itself has a `country` string field) — SS1-SS3/JSS are already data, not hardcoded. Real gap is only that `Curriculum.country` is a free string like `School.country`, not yet a `Country` relation. |
| `Locale` | **Does not exist in any form.** No i18n library (`next-intl`/`i18next`/`react-intl`) is installed (checked `package.json`, zero matches). Every user-facing string in every component is inline English. This is not a small addition — it's an app-wide extraction-and-wrap effort across hundreds of files, on top of adding the library itself. |
| Phone E.164 | No phone field exists on `User` at all — green-field, not a migration of an existing bad format. |

**Also true but not requested by name**: Kenya and South Africa are **not seeded at all** (not even `DRAFT`) — only Ghana, Sierra Leone, Liberia, and The Gambia exist as dormant `Country` rows. The brief's "Ghana, Kenya and South Africa seeded but flagged off" is aspirational, not current state.

**Bottom line**: Phase 1 as scoped is significantly smaller than "build a country abstraction layer from scratch." The real Phase 1 work is: (a) add `Region` and migrate `School.state`/two hardcoded state-list files onto it with the `?state=Lagos` alias test; (b) point `Curriculum.country`/`School.country` at the existing `Country` relation instead of a parallel free string; (c) seed Kenya + South Africa as new `Country` rows and their exam bodies (KCSE, NSC) + Ghana's WASSCE-GH/BECE using the *existing* `ExamBody`/`Exam`/`CountryExam` mechanism; (d) populate `CountryExamSubject`/`ExamTopic` for at least one non-Nigeria country to prove the "boots from seed data alone" definition of done; (e) fix the concrete hardcodes in §5 (currency formatters, compulsory-subject rule, AI prompt, NECO→WAEC special case) to read from this now-existing data instead of literals; (f) decide whether Locale/i18n is actually in scope for this phase or deserves its own phase, given it's the single largest undertaking on the list and has zero existing infrastructure to build on.

See `docs/migration-plan.md` for the phased proposal this drives.
