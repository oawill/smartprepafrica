# TOEFL Module — Known Limitations & Regression Record

Date: 2026-09-06
Status: Step 14 (final step) of the TOEFL implementation — regression,
hardening, and this consolidated handoff document, per the brief's
"document, don't silently perform" rule that governed every scope
decision made along the way.

## What TOEFL now covers

Built as an additive module behind `ENABLE_TOEFL`, touching zero
existing WAEC/UTME/admin behavior. One line per step:

1. **Foundation** — schema (`ToeflContent`/`ToeflAttempt`/`ToeflAttemptItem`),
   feature flag, nav/permission scaffolding.
2. **Nav + flag** — `isToeflEnabled()` gate wired into student and admin nav.
3. **Config/model** — `TOEFL_CONFIG` central timing/scale config.
4. **Landing + dashboard** — public landing page (with ETS non-affiliation
   disclaimer), student readiness dashboard.
5. **Reading** — MCQ practice, real seeded passages.
6. **Listening** — MCQ practice with real generated TTS audio.
7. **Writing** — timed essay editor, autosave, word-count minimum.
8. **Speaking** — real browser mic recording via `MediaRecorder`.
9. **Diagnostic** — cross-skill readiness check, open-pace MCQ.
10. **Mock Exam** — full-length timed exam, hard MCQ countdown, every
    published Writing/Speaking prompt.
11. **Admin Portal** — full content CRUD + review workflow
    (`DRAFT → NEEDS_REVIEW → APPROVED → PUBLISHED`/`ARCHIVED`).
12. **Analytics** — real aggregate rollups over attempts, honest about
    what isn't auto-scored.
13. **AI Scoring** — real Claude-graded Writing, real Whisper-transcribed
    + Claude-graded Speaking (pronunciation deliberately never scored).
14. **Regression & hardening** — this pass.

## Known limitations & deferred work

Compiled from decisions made and documented (not silently dropped) at
the step where each was raised:

- **No bulk actions in the admin Content CRUD** (Step 11). Content
  volume today (16 rows) doesn't justify it. The generic
  `src/lib/admin/bulk-types.ts` types and `BulkActionBar`/
  `BulkResultBanner` components already exist and are reusable if
  volume grows — see `question-bulk-table.tsx` for the pattern to follow.
- **`CONTENT_REVIEWER` has `toefl.review`/`toefl.archive` but not
  `toefl.publish`** (Steps 11/12), unlike `Question`'s reviewer role,
  which has all three. This predates Step 11 — it was set in Phase 1 —
  and was left as-is rather than silently changed. If reviewers should
  be able to publish TOEFL content directly, add `toefl.publish` to
  `CONTENT_REVIEWER` in `src/lib/admin/permissions.ts`.
- **`overallScore` only ever averages Reading + Listening** (Steps
  9/10/13), even now that Writing/Speaking have real AI scores. This is
  a product decision to make deliberately (via
  `computeDiagnosticOverallScore` in `src/lib/toefl/scoring.ts`), not
  an oversight.
- **`ToeflAttempt.writingScore`/`speakingScore` are never populated**,
  even by Step 13's real AI evaluator — only the per-item
  `ToeflAttemptItem.evalScore` is set. Found during this step's
  regression: the student dashboard and admin analytics both correctly
  and honestly show `--`/`—` for Speaking/Writing averages as a result,
  never a fake number, but a future step could choose to roll evaluated
  item scores up into these attempt-level columns if per-skill Speaking/
  Writing trend lines are wanted on the dashboard/analytics.
- **No retry/re-evaluate action for a `FAILED` AI evaluation** (Step 13).
  A student whose evaluation failed (network issue, API outage) sees an
  honest "AI evaluation failed" message with no way to trigger a retry
  from the UI.
- **No usage/cost logging for TOEFL AI evaluator calls** (Step 13),
  unlike AI Coach/Voice's `aiUsageLog`/`estimateCostKobo` pattern
  (`src/lib/ai/pricing.ts`). Real API costs are being incurred per
  Writing/Speaking submission with no visibility into that spend from
  the admin portal today.
- **`OPENAI_API_KEY` is not set in Vercel production** (confirmed at
  Step 13's deploy) — Speaking evaluation stays honestly "not currently
  available" in production until it's added there.
  `ANTHROPIC_API_KEY` already is set, so Writing evaluation works in
  production as soon as `ENABLE_TOEFL` is turned on there.
- **No country/segment breakdown in TOEFL analytics** (Step 12) —
  `ToeflAttempt`/`ToeflContent` have no country dimension in the schema,
  unlike the Platform health dashboard's `ExamAttempt`-based country
  filter.
- **Content pool is still small**: 5 Reading, 5 Listening, 3 Writing, 3
  Speaking prompts. The admin portal (Step 11) exists specifically so
  this can grow without engineering involvement going forward.

## Recommended future work (prioritized)

1. **Add `OPENAI_API_KEY` to Vercel production** — a five-minute
   operational task that unlocks real Speaking evaluation in production
   immediately (Writing evaluation is already unblocked there).
2. **Decide whether Writing/Speaking should count toward `overallScore`**
   — a product decision, not an engineering one; the scoring function is
   already isolated in one place (`computeDiagnosticOverallScore`) to
   make this a small, contained change whichever way it's decided.
3. **Wire `evalScore` up into `ToeflAttempt.writingScore`/`speakingScore`**
   if per-skill Speaking/Writing trend data is wanted on the dashboard/
   analytics — currently a deliberate gap, not a bug, but likely worth
   closing once real evaluation data accumulates.
4. **Add AI usage/cost logging for the TOEFL evaluators**, reusing the
   existing `aiUsageLog` pattern, once there's real production
   volume worth tracking.
5. **Grant `CONTENT_REVIEWER` the `toefl.publish` permission** if the
   review→publish split should match `Question`'s model exactly.
6. **Add a retry action for `FAILED` evaluations** once real-world
   failure rates (network blips, provider outages) are observed in
   production — not worth building against a hypothetical failure rate
   today.

## Step 14 regression record

All of the below were verified live, with real data (real AI grading
calls, real synthesized speech audio through the real Whisper→Claude
pipeline — no stubs), using disposable QA accounts cleaned up
afterward:

- **Full functional pass** — Reading, Listening, Writing, Speaking
  (standalone), Diagnostic, and Mock Exam all completed end-to-end in
  one continuous session; all six attempts appeared correctly on the
  student dashboard and in admin Analytics with real, matching numbers.
- **Non-affiliation disclaimer** — confirmed present and unchanged on
  the landing page.
- **Mobile viewport (375×812)** — checked the landing page, dashboard,
  Writing editor, Speaking recorder, a Diagnostic MCQ session (passage +
  options + Previous/Next), a results page's two-column AI evaluation
  grid, and the admin Content list table. All render usably; the admin
  table is intentionally horizontally scrollable (confirmed via
  `scrollWidth` > `clientWidth`) rather than redesigned for mobile,
  matching how dense admin data tables are handled elsewhere in this app.
- **Failure-handling / adversarial URLs** — confirmed a results URL for
  another user's attempt 404s (ownership guard), an in-progress
  attempt's results URL redirects to its session instead of showing
  incomplete data, the Speaking mic-denied path still shows its
  graceful message, and a `FAILED` evaluation still renders its honest
  message rather than crashing.
- **Bug found and fixed in this pass**: the Diagnostic/Mock Exam landing
  and results pages' "aren't included in this estimate" copy claimed
  Writing/Speaking AI evaluation "is not currently available" — true
  when written (Step 9/10), stale after Step 13 shipped real evaluation.
  Reworded across all four locations
  (`diagnostic/page.tsx`, `diagnostic/results/[attemptId]/page.tsx`,
  `mock-exam/page.tsx`, `mock-exam/results/[attemptId]/page.tsx`) to
  describe score composition only, accurate regardless of evaluator
  configuration state.
- **`ENABLE_TOEFL=false` final sweep** — all 8 student TOEFL routes
  404; all 4 admin TOEFL routes redirect to login exactly like every
  other unauthenticated admin route (not TOEFL-specific — admin routes
  are permission-gated, not flag-gated, by design since Step 11); the
  "International Exams" group is absent from both the student and admin
  nav; WAEC/UTME practice, the WAEC/UTME admin Questions flow, Learning
  analytics, and Platform health are all fully unaffected.
- **Static sweep** — `tsc --noEmit`, `eslint` (scoped to every TOEFL
  path), zero `TODO`/`FIXME` remaining, `npm test` (62/62), and
  `npm run build` all clean, both before and after this step's copy fix.
