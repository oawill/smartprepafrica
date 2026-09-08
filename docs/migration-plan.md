# Migration Plan — Coursera-grade Learning Platform

Proposed after Phase 0 audit (`docs/audit.md`). This revises the original
brief's phase scope where the audit found existing infrastructure — the goal
is to build only what's actually missing, and to avoid re-litigating things
that already work. Awaiting approval before any code changes.

## Ground rules carried from the working agreement

- Plan mode per phase: this document is the Phase 1 plan; each subsequent
  phase gets its own plan-mode round before implementation.
- One phase per branch, small commits, conventional commit messages.
- No `prisma db push` against production, ever. Every schema change is a
  `prisma migrate dev` migration with a reviewed down path. **Since
  `prisma/migrations/` doesn't exist yet, the very first migration in Phase 1
  establishes migration history from the current schema — I'll generate it
  as a no-op baseline migration first, confirm it applies cleanly to a copy
  of production's actual schema state, then layer the real Phase 1 changes
  as a second migration.** This baseline step needs explicit sign-off before
  I touch the production database at all, same as every prior schema change
  in this project.
- After each phase: `npx tsc --noEmit`, `npx eslint --quiet` on changed
  files, `npm test`, `npx prisma validate`, and `prisma migrate diff`
  against the previous migration — pasted, not summarized.
- Any change that would break an existing public URL stops for explicit
  confirmation before proceeding, not just a heads-up after.
- No CI exists today. I'll propose a minimal GitHub Actions workflow
  (typecheck + lint + test on push) as part of Phase 1, since a multi-phase
  migration without CI means every regression is caught manually or not at
  all — but this is a suggestion to approve, not something I'll add
  unilaterally.

---

## Phase 1 (revised) — Region, Curriculum→Country, and activating what exists

The audit found `Country`, `ExamBody`, `Exam`, `CountryExam`,
`CountryExamSubject`, `ExamTopic`, and `CountryPlanPrice` already built and
live. Phase 1 is **not** "build a country abstraction layer" — it's four
narrower, concrete pieces of work:

### 1a. `Region` model + state-list migration
- New model: `Region { id, country Country/countryId, name, code?, createdAt }`.
  Nigeria's 36 states + FCT become 37 `Region` rows under `countryId = NG`.
- `School.state` (currently a free string) gains a parallel `School.regionId
  String?` FK, populated by matching existing string values to the new
  `Region` rows in the same migration (a data-backfill step, reviewed before
  running). The free-string `state` column stays for one release as a
  read-fallback, not dropped in this phase — dropping it is a follow-up once
  100% of rows have `regionId` set and every consumer reads the new field.
- Both hardcoded state-list files (`src/lib/nigerian-states.ts` and the
  second, out-of-sync copy in `src/app/page.tsx:18`) get replaced by a query
  against `Region` for the active country. This also fixes the fact that
  today's homepage list (6 states) and the school-registration list (37
  states) silently disagree.
- **`?state=Lagos` must keep resolving.** Concretely: `educom/schools`'s
  filter reads the `state` query param, looks up the matching `Region.name`
  for the request's active country, and filters by `regionId` — the URL
  shape and the string value "Lagos" never change, only what resolves it
  internally. Test to write: hit `/educom/schools?state=Lagos` against
  seeded data and assert the same schools return as today, byte-identical
  query-param handling.

### 1b. `Curriculum.country` / `School.country` → real `Country` relation
- Both currently free strings defaulting to `"Nigeria"`, sitting *next to* an
  already-unused `Country` relation (`School.countryRef`/`countryId`) in
  `School`'s case, and no relation at all in `Curriculum`'s case.
- Add `Curriculum.countryId` FK, backfill from the existing string, same
  pattern as 1a. Switch `School` to filter/join on `countryId` instead of
  the string everywhere it's currently used (confirmed low blast radius —
  only 2-3 call sites per the audit).

### 1c. Populate the existing exam-board infrastructure for a second country
- No new tables. Add rows: Kenya + South Africa as new `Country` (status
  `DRAFT`), KCSE under a new `ExamBody`, NSC under a new `ExamBody`, WASSCE-GH
  and BECE as `CountryExam` rows against Ghana (Ghana already exists as
  `DRAFT`). Populate `CountryExamSubject` + `ExamTopic` for at least Kenya's
  KCSE + one subject (e.g. Mathematics), enough to prove the pipeline works
  end to end, not a full syllabus.
- **This directly produces the brief's definition of done**: seed Kenya,
  boot the catalog, assert a Kenyan-scoped view renders — using
  infrastructure that already exists, so this is a seed script + one
  integration test, not new schema.

### 1d. Fix the concrete hardcodes the audit found (small, mechanical)
- Collapse the four independent Naira-only currency formatters
  (`lib/plans.ts`, the duplicate in `lib/partners/compensation.ts`, the two
  ad-hoc `admin/page.tsx`/`admin/finance/page.tsx` copies) into one function
  that reads `Country.currency`/`currencySymbol`, falling back to NGN's
  existing special-cased formatting only when `currency === "NGN"` (so
  Nigeria's exact current output doesn't change — a snapshot test pins this).
- `getCompulsorySubjectNames()` (`lib/practice/exam-profile-service.ts`)
  reads from a new boolean on `CountryExamSubject` (or `ExamTopic`) instead
  of a hardcoded `if (exam === "UTME")` string check.
- NECO→WAEC profile-reuse special case (`practice/[exam]/subjects/page.tsx`)
  generalizes to "does this student have a profile for another exam under
  the same `ExamBody`" — reads from `CountryExam`/`ExamBody` instead of a
  literal string comparison.
- AI Coach system prompt (`lib/ai/prompt-builder.ts:51`) becomes
  country/exam-aware, built from the student's actual `Country` +
  `CountryExam` rows instead of a hardcoded Nigeria sentence.

### 1e. Explicitly deferred, needs your decision
- **`Locale`/i18n**: zero existing infrastructure (no library installed, no
  Locale model, every string inline). This is comparable in size to
  everything else in Phase 1 combined, and touches hundreds of files just
  for extraction — before any actual French/Swahili/Hausa/Yoruba copy is
  written. I'd rather scope this as its own phase (between 1 and 2, or
  later, your call) than fold it into "Phase 1" silently and have it either
  balloon the timeline or get rushed. Flagging now rather than after
  starting.
- **Phone E.164**: no existing field, so no migration risk either way — but
  since nothing currently depends on it, I'd only add it when a phase
  actually needs it (SMS/WhatsApp OTP is Phase 3+ per the brief's
  constraints section) rather than speculatively now.

### Phase 1 definition of done (revised)
`npx tsx scripts/seed-kenya.ts` (or equivalent) seeds Kenya from data alone —
`Country` + `ExamBody`/`Exam`/`CountryExam` (KCSE) + one `CountryExamSubject`
+ a few `ExamTopic` rows + one `Region` — with **zero code changes**, and a
new integration test boots that seed data and asserts a Kenya-scoped catalog
query returns the seeded content. A second test asserts
`/educom/schools?state=Lagos` still returns the same results as before the
migration. Nigerian students see no country-switching UI (Kenya/Ghana/etc.
stay `DRAFT`, same visibility rule the `Country.status` enum already
enforces today for Ghana).

---

## Phase 2 (revised) — Course hierarchy: mostly verification, not construction

The audit found `Course → Module → Lesson → Quiz → Certificate` already
built and populated with real data (13 courses, 15 modules, 23 lessons, 13
enrollments, 4 certificates; 2 of 13 courses already span multiple modules).
Phase 2 becomes:

1. **Audit + close the thin spots**, don't rebuild: add completion-criteria
   fields to `Certificate` (currently just `user+course+issuedAt+certUrl`),
   decide whether `Assignment` needs to become a scored `Assessment` type or
   stays freeform-only, and reconcile `CourseTopic` vs `Module` vs plain-string
   `Lesson.topic` — three parallel groupings today (deliberate, per schema
   comments) that a real hierarchy redesign should either formalize or
   consciously leave alone. This needs its own plan-mode discussion once
   you've seen this document, since "what does Assessment actually need to
   do" is a product decision, not something to infer from the schema.
2. **Migrate remaining single-module courses is NOT needed** — the schema
   already supports N modules per course; single-module courses are just
   courses with one `Module` row, not a different data shape. Nothing to
   migrate structurally.
3. Preserve `/educom/seed-course-*` URLs and learner counts: write the test
   the brief asks for regardless, since it's cheap insurance even though the
   hierarchy already exists — asserts routes still 200 and enrollment counts
   match pre/post any Certificate/Assessment field additions.
4. Live classes are already a `Lesson`-adjacent concept (`LiveClass` model,
   FK'd to `Course`) — confirm in this phase whether it should actually
   become a `Lesson.type` variant (per the brief's "Lesson (video | text |
   pdf | live_session)") or stay a sibling model; this is a real design
   choice the audit surfaced but didn't answer.

---

## Phase 3+ — unchanged in spirit, two audit-driven corrections

The brief's ordering (Progress → Certificates → Payments → Instructor studio
→ School dashboard → Prep↔Learning loop → Discussions → Gamification) still
makes sense. Two corrections from what the audit found:

- **Progress (item 3) is largely already built**: `LessonProgress` already
  tracks resume position, completion, and quiz score; `StudentTopicMastery`
  already computes topic-level mastery and is *already shared* between Prep
  and Learning (same EMA mechanism, both call the same
  `recordTopicAttempt`). This phase is about module/course-level rollups
  and syllabus-tree alignment via the new `ExamTopic`/ `CountryExamSubject`
  data from Phase 1c, not building progress tracking from zero.
- **Payments (item 5)'s real blocker isn't the provider abstraction** — it's
  that `enrollInCourse()` has **no price/entitlement check at all today**,
  Server Action-callable directly regardless of `priceKobo`. The
  `PaymentProvider` interface work is real and needed for Flutterwave, but
  the higher-priority fix is adding the entitlement guard itself; a second
  provider behind an ungated enrollment path doesn't help. I'd sequence
  this as: (a) add the entitlement check against existing
  `CourseEnrollment`/a new `CoursePurchase`-style model first, gated on
  Paystack alone, (b) then add the `PaymentProvider` interface and
  Flutterwave once the gate itself is proven. Grandfathering everyone
  currently enrolled in a free course: since nothing is paywalled today,
  "grandfather" means every existing `CourseEnrollment` row gets an explicit
  `grantedFree: true`-style flag (or equivalent) in the same migration that
  introduces the price gate, so the gate's `WHERE` clause is additive, never
  retroactively locking someone out — this migration gets written and shown
  to you explicitly before it runs anywhere.
- **Prep↔Learning loop (item 8), the "weak topic → recommend course"
  direction already exists and works** (`getTodaysRecommendation`, live on
  the student dashboard today). Only the reverse direction — "completing a
  module unlocks targeted Prep drills" — is net-new work.

Items 6 (Instructor studio), 7 (School dashboard), 9 (Discussions), and 10
(Gamification) are genuinely net-new; the audit found no existing
infrastructure for CSV question import into Learning specifically (Prep has
its own, separate CSV import per `lib/admin/question-csv.ts` — worth reusing
the parsing conventions, not the exam-specific validation), no
instructor-payout wiring beyond the existing Partner compensation system
(worth reusing that pattern rather than inventing a second payout
mechanism), and no discussion/leaderboard models at all. These stay as
scoped in the brief; I'll bring a plan-mode proposal for each when we get
there.

---

## What I need from you before Phase 1 starts

1. **Confirm the revised Phase 1 scope above** (1a–1d) is what you want, not
   the original "8 new entities from scratch" framing — since 4 of those 8
   already exist.
2. **Decide on Locale/i18n's place in the roadmap** (1e) — own phase, folded
   into Phase 1 anyway, or deferred past the Learning-platform work
   entirely until a specific country needs it.
3. **Approve or reject the baseline-migration step** (establishing
   `prisma/migrations/` history for the first time) before I run anything
   against even a local copy of the schema.
4. **Approve or reject adding a minimal CI workflow** as part of Phase 1,
   given none exists today and this is a multi-month, multi-phase effort.

I'll wait for these before writing any code or opening a branch.
