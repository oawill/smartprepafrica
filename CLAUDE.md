@AGENTS.md

# Project conventions (learned, not auto-generated)

This section is maintained by hand across sessions — unlike the `@AGENTS.md`
import above, which `next dev` rewrites on its own. Add to this as new
conventions are confirmed; don't let it go stale.

- **Test runner**: `node:test` via a custom bootstrap, `node tests/run.mjs` (`npm test`) — not Jest/Vitest, and not the raw `tsx --test` CLI.
  The bootstrap bounds `DATABASE_URL`'s `connection_limit` and caps `--test-concurrency` (see the comments in `tests/run.mjs`) — Node's default
  per-file-process concurrency otherwise exhausts local Postgres's connection limit and causes flaky failures. Tests live under `/tests`, not
  colocated with source. Most test files are pure-function tests; a subset (see `tests/helpers/fixtures.ts`) run real queries against the local
  dev database with no transaction rollback — manual `after()` cleanup only. DB-touching functions are otherwise not unit-tested by convention.
- **No CI.** No `.github/workflows` (a workflow file was attempted once but blocked by the git remote's OAuth token lacking `workflow` scope).
  "Green" is `npx tsc --noEmit` (no npm script wraps this — run it directly), `npx eslint --quiet`, `npm test`, and `npx prisma validate`, all
  run locally before pushing.
- **Prisma migration history exists** (`prisma/migrations/`, established starting Phase 1 — baseline migration `20260908204232_baseline`). Use
  `prisma migrate dev --name <name>` for schema changes (`--create-only` when a migration needs hand-edited backfill SQL before applying). The
  project no longer uses `prisma db push` for schema changes that need to reach production.
- **Git**: push directly to `master`, no PR workflow. Stage explicit file paths, never `git add -A` (this repo has permanently-untracked
  `.agents/`, `.claude/skills/`, `skills-lock.json` that must never be committed). Commit messages end with a `Co-Authored-By:` trailer for the
  acting Claude model.
- **Production DB changes require explicit user confirmation first** — never `prisma db push`/`migrate deploy` against production without asking,
  every time, regardless of how minor the change looks.
- **Country/exam abstraction already exists**: `Country`, `ExamBody`, `Exam`, `CountryExam`, `CountryExamSubject`, `ExamTopic`, `CountryPlanPrice`
  are live in the schema (see `docs/audit.md` §7) — don't assume a country/board/pricing feature needs new tables before checking these first.
- **Money fields are `*Kobo`/`priceMinor`-suffixed ints** (minor currency unit), never floats. `CountryPlanPrice.priceMinor` is the one
  currency-agnostic field; most others assume kobo/NGN and need `Country.currency`-aware handling added when touched (see `docs/audit.md` §5).
