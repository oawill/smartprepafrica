# Phase 0 Audit — SmartPrepAfrica Learning Platform (v2)

Audited 2026-09-09 against `master` @ `e64e54e`. This **supersedes** the
2026-09-08 audit at the top of this file's git history — a full roadmap of
work has shipped since then (country/exam abstraction, the full
Course→Module→Lesson hierarchy, subscription payments, instructor studio,
school dashboard, the Prep↔Learning loop, Discussions, Gamification,
Instructor payouts, School bulk licences). Every claim below was verified by
reading the actual file/line — nothing is inferred from naming alone.

**Headline finding**: the brief's Phase 2 ("Country abstraction layer") and
much of Phase 3/5–9 ("Course hierarchy", "Payments", "Instructor studio",
"School dashboard", "Prep↔Learning loop", "Discussions", "Gamification") are
**already built and live in production**, under different names than the
brief proposes. The genuinely new work in this brief is narrower and
different in shape: a `/learn` rename, removing the Skills vertical, a
three-tier Class/Course/Programme vocabulary (Programme doesn't exist),
phone-first/OTP student intake (auth is email+password only today), a
payment-provider abstraction (Paystack is hardcoded everywhere), and
offline/PWA/low-bandwidth work (not audited here — no existing PWA
manifest or offline-cache code was found in either pass). See
`docs/migration-plan.md` for the resulting revised phase plan.

---

## 1. Course model and hierarchy

Already a real, populated hierarchy — not a flat 45–90min session:

```
Course (prisma/schema.prisma:1157-1223)
  → Module (:1293) → Lesson (:1328, type VIDEO|TEXT|QUIZ|PDF — no LIVE type)
                        → LessonChapter, QuizQuestion (:1414, serves both
                          in-video checkpoints via atSeconds and end-of-lesson
                          quizzes — no separate LessonQuiz model)
  → CourseEnrollment (:1459) → LessonProgress (:1474, resume position,
      percentWatched high-water-mark, per-lesson score)
  → Assignment (:1493) → AssignmentSubmission
  → Certificate (:1520, id+userId+courseId+issuedAt+certUrl)
  → LiveClass (:1238) — live sessions are a model hung off Course directly,
      not a Lesson type
  → Discussion, TeacherCommission, ClassCourseAssignment
```

Where the brief's specific fields live: `MEDIUM` → `Difficulty` enum
(`EASY|MEDIUM|HARD`) on `Course.difficulty`. `60 min` → plain
`Course.estimatedMinutes: Int?`. `Free` → `Course.requiresSubscription:
Boolean` (the real gate; `Course.priceKobo` is vestigial, schema comment
says so explicitly). **Learner count is never stored** — always computed
live via `_count.enrollments`, confirmed at 7 call sites across the catalog,
course detail, search, school, and teacher pages. `Course.schoolId` /
`Course.teacherId` are direct optional FKs (both null for centrally-seeded
courses).

## 2. Skills taxonomy — and archival

`CourseCategory` enum (`:1100-1112`) is one flat field on `Course`:
`ACADEMIC | CAREER_DEVELOPMENT | TECHNOLOGY | AI | CODING |
FINANCIAL_LITERACY | COMMUNICATION | LEADERSHIP | MINDSET | DISCIPLINE |
LIFE_SKILLS`. Two live Skills courses seeded in `prisma/seed.ts`:
**"Financial Literacy Basics"** (`seed-course-financial-literacy`,
`FINANCIAL_LITERACY`, 45 min) and **"Introduction to Coding with Python"**
(`seed-course-intro-coding`, `CODING`, 60 min). Neither seed file creates
enrollments for them — any learner count today is real runtime enrollment
data, not fixture noise.

**No archive/soft-delete concept exists on `Course` at all.** Grep for
`archived|isArchived|ARCHIVED` across the whole schema hits only
`VideoRenderStatus.ARCHIVED` and `QuestionStatus.ARCHIVED` — unrelated. The
brief's requirement ("add an `archived` state... preserve URLs for enrolled
learners, preserve progress") is a real, net-new schema change, not
something to repurpose from an existing field.

## 3. Route structure — `/educom` → `/learn`

Confirmed **no `/learn` route exists today**. Full current tree under
`src/app/educom/`: `page.tsx` (catalog), `[courseId]/page.tsx`,
`[courseId]/lessons/[lessonId]/page.tsx`, `class/[classLevelId]/page.tsx`,
`rankings/page.tsx`, `schools/page.tsx`, `schools/[schoolId]/page.tsx`,
`search/page.tsx`, `teachers/[teacherId]/page.tsx` (no teacher *index*
listing page), plus `actions.ts` / `discussion-actions.ts` /
`lesson-player-actions.ts`. No `route.ts` handlers anywhere — everything is
server-rendered pages + Server Actions, which simplifies a redirect
strategy (no API consumers to break, only browser navigations and internal
links).

**Blast radius**: case-insensitive grep for `"educom"` across `src/`
hits **35 files, 108 occurrences** — the route folder itself plus
references from dashboard/admin/teacher pages that link into
`/educom/...` or reuse "Educom" in identifiers. A rename touches all 35
files, not just the route folder; budget for that specifically as its own
migration step with redirect tests (old paths → new, `?state=`/query
params preserved), per the brief's explicit requirement.

## 4. Country/exam abstraction — already built

All seven entities the brief's Phase 2 asks for already exist, under
different names, and are richer than a skeleton:

| Brief's name | Actual model | State |
|---|---|---|
| `Country` | `Country` (`:449`) | Live — `code`, `currency`, `currencySymbol`, `flag`, `status: CountryStatus`, `defaultLanguage` |
| `Region` | `Region` (`:477`) | Live but **additive-only** — `School.state` is still free text; `Region` isn't yet the load-bearing filter |
| `ExamBoard` | `ExamBody` (`:493`) + `Exam` (`:506`) | Live — global exam-body/exam definitions, country-activated via `CountryExam` |
| `GradeLevel` | `ClassLevel` (`:1143`) | Live — scoped under a `Curriculum`, referenced by `Course.classLevelId`. Note: `StudentProfile.gradeLevel` is a separate, unrelated free-text field, not an FK to this |
| `SyllabusTopic` | `ExamTopic` (`:563`), scoped via `CountryExamSubject` | Live — correctly scoped per-board (Maths-under-WAEC ≠ a hypothetical Maths-under-KCSE) |
| `Currency`/`PriceTier` | `CountryPlanPrice` (`:578`) | **Schema exists but dormant** — explicit comment: "Dormant until wired into checkout." `resolvePlanPrice()` checks it first but falls back to a hardcoded `PLAN_PRICING_KOBO` Nigeria table, and returns `currency: "NGN"` unconditionally on that fallback |
| `Locale` | **Does not exist** | Zero i18n — no `Locale` table, no `next-intl`/`i18next` in `package.json` or `src/`. All copy is hardcoded English |

**Phone numbers**: `User` has no phone field at all — only `Partner.phone`
and `PartnerSchoolLead.phone`, both plain unformatted `String`, unrelated to
student accounts. The brief's "store E.164, OTP via WhatsApp" requirement
is fully unbuilt for students.

## 5. Auth model

`src/lib/auth.ts` — NextAuth v5, JWT session strategy (no DB sessions),
**one Credentials provider: email + bcrypt password**. No phone-based
signup or login exists anywhere. `Role` enum: `STUDENT, PARENT,
SCHOOL_ADMIN, TEACHER, SPONSOR, PARTNER, ADMIN`. Session revocation uses a
`sessionVersion` counter re-checked per JWT callback.

OTP exists, but only for **email password-reset** (`src/lib/password-reset.ts`,
6-digit code emailed via `sendEmail`) — never SMS/WhatsApp, never used for
signup or login. Grep for `whatsapp|Twilio|Termii` across `src/`: zero
matches. The brief's "Door 1: phone-first signup, WhatsApp OTP with SMS
fallback" and "Door 2: PIN-based class-code login, no email required" are
both fully unbuilt — today every account requires an email + password,
full stop.

## 6. Payments — real vs. promised, and the provider-abstraction gap

`/pricing` is honest: every plan with a "Choose" button (`FREE`, `BASIC`,
`PREMIUM`, `PRO`, plus flag-gated `TOEFL`/`SAT` one-time products) has a
real working checkout action; `SCHOOL` correctly shows a contact link
instead of a fake button. Paystack (`src/lib/paystack.ts`) is fully wired:
idempotent activation keyed off `Payment.reference`, refund/chargeback
reversal, and — as of this session's most recent phase — a parallel
`SchoolLicensePurchase` checkout path for bulk school seats
(`src/lib/schools/license-checkout.ts`) using the same shape.

**There is no `PaymentProvider` interface anywhere.** Grep for
`flutterwave|mpesa|M-Pesa|MoMo`: zero matches in `src/` or `package.json`.
Every checkout path imports `src/lib/paystack.ts` functions directly and
hardcodes the literal `provider: "paystack"` when persisting rows (3 call
sites: `paystack.ts`, `license-checkout.ts`,
`international-exams/checkout-service.ts`). The brief's "Paystack +
Flutterwave behind a `PaymentProvider` interface so M-Pesa/MoMo drop in per
country" is real, unbuilt work — and now touches **three** checkout call
sites instead of one, since two more were added this session.

Also found: `src/lib/teachers/compensation.ts` hardcodes the `₦` symbol
directly rather than routing through the existing `formatMoney()`
currency-abstraction helper — a small, real regression to fix as part of
the provider-abstraction work, not a new problem to design around.

## 7. Remaining hardcoded Nigeria assumptions

Genuine, fixable issues (not just enum references or Nigeria-correct seed
data):
- `src/lib/plans.ts` — `resolvePlanPrice()`'s fallback path returns
  `currency: "NGN"` unconditionally when no `CountryPlanPrice` override
  exists for a plan/country. This is the actual load-bearing default today
  for every plan in every non-configured country.
- `question-form.tsx` / `passage-form.tsx` (admin content tools) default a
  new question/passage's exam to `"WAEC"` when unset; a Learning lesson
  quiz posts `course.examType ?? "UTME"` — real fallback defaults baked
  into logic, confined to admin/content authoring, not student-facing
  catalog logic.
- `.toLocaleDateString("en-NG")` is hardcoded across ~20+ admin dashboard
  pages (finance, AI usage, legal, security, partners, teacher payouts) —
  cosmetic date-format only, but genuinely wrong for a multi-country
  product.

Confirmed **fine, not a problem**: `?state=` filtering
(`getFeaturedNigerianStates()` already queries the country-scoped `Region`
table, not a hardcoded array — file/function naming is a smell, the
implementation is already correct); `SS3` appearing only as a CSV-template
example row and an input placeholder, never a real default.

## 8. Certificates — partially built

`/certificates/[certificateId]` already exists: public, no-auth, shows
student name + course title + school. It does **not** match the brief's
`/verify/[code]` shape exactly — it's keyed by the raw certificate `cuid`
in the URL rather than a short human-shareable code, and doesn't display
exam board or country. Closing this gap is a small, well-scoped addition
on top of an already-working feature, not new infrastructure.

## 9. Test setup and CI

`npm test` → `node tests/run.mjs`, a custom bootstrap around Node's
built-in test runner (bounds `DATABASE_URL`'s connection pool to avoid
exhausting local Postgres under per-file-process concurrency). Real test
suites exist for most shipped features (`tests/{ai,educom,gamification,
geo,learning,practice,rbac,sat,school,schools,teachers,toefl,...}`).
**`.github/workflows/` still does not exist on `master`** — confirmed via
`git ls-tree`. The OAuth `workflow`-scope block from an earlier session is
still in effect; no CI has ever actually run for this repo.

## 10. What Phase 5+ items from the brief are already done

Confirmed shipped and live in production, contrary to the brief's
"not yet built" framing:
- **Progress** — `LessonProgress` (resume position, completion %,
  per-lesson score) has existed since the course-hierarchy phase.
- **Payments** — real, minus the provider-abstraction gap noted in §6.
- **Instructor studio** — course authoring, CSV question import, lesson
  scheduling (`publishAt` drip content), and a real payout system
  (`TeacherCommission`/`TeacherPayout`, commission-per-paid-enrollment,
  admin approve/pay workflow) all exist.
- **School dashboard** — rosters, bulk CSV enrolment, class assignment
  with due dates, state/national performance benchmarking, CSV exports,
  and (as of the most recent phase) bulk seat licensing all exist.
- **Prep ↔ Learning loop** — both directions: weak-topic→lesson
  recommendation, and lesson-completion→targeted Prep drill.
- **Discussions + Ask a tutor** — per-lesson/course Q&A with human
  escalation to the course's teacher or an admin fallback queue.
- **Gamification** — XP, badges, and an opt-in per-school leaderboard that
  never publicly ranks below the top 20.

Not yet built, and not covered by any existing feature under a different
name: the `/learn` rename, Skills-vertical archival, Class/Course/Programme
vocabulary (no `Programme`/bundle-of-courses model exists), all three
student-intake doors, the payment-provider abstraction, offline/PWA/
low-bandwidth support, and i18n/`Locale`.

See `docs/migration-plan.md` for the revised phase sequence this implies.
