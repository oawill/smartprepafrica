# SmartPrepAfrica + EduCom

Nigerian exam-prep platform (WAEC, NECO, UTME, Post-UTME) combined with
EduCom, a Coursera-style learning ecosystem for career, technology, and
life-skills courses.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth v5 (Credentials provider, JWT sessions)
- Paystack (subscription payments)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env file and fill in a real database URL:

   ```bash
   cp .env.example .env
   ```

3. Point `DATABASE_URL` at a running Postgres instance, then push the schema:

   ```bash
   npm run db:push
   npm run db:seed
   ```

   (Use `npm run db:migrate` instead of `db:push` once you want versioned
   migrations.)

4. Add Paystack test keys to `.env` (`PAYSTACK_SECRET_KEY`,
   `PAYSTACK_PUBLIC_KEY`) if you want checkout to work — get them from
   [the Paystack dashboard](https://dashboard.paystack.com/#/settings/developer).
   Without them, `/pricing` still renders but checkout fails gracefully.

5. Start the dev server:

   ```bash
   npm run dev
   ```

## Project structure

- `src/app/` — routes (marketing site, `/login`, `/register`,
  `/dashboard/*` role shells, `/educom`, `/practice`, `/pricing`)
- `src/app/dashboard/` — auth-gated dashboards, one per role (student,
  parent, school, sponsor, admin)
- `src/app/practice/` — CBT engine: exam/subject/mode picker
  (`/practice/[exam]`), the session runner (`/practice/session/[attemptId]`),
  and scored results with explanations (`/practice/results/[attemptId]`)
- `src/app/educom/` — course catalog, course overview with enrollment, and
  the lesson player (`/educom/[courseId]/lessons/[lessonId]`) with progress
  tracking and certificate issuance on completion
- `src/app/pricing/` + `src/lib/paystack.ts` — plan pricing, Paystack
  checkout initiation, and the `/api/payments/callback` +
  `/api/webhooks/paystack` routes that verify payment and activate a
  subscription
- `src/lib/auth.ts` — NextAuth config (Credentials + Prisma adapter)
- `src/lib/prisma.ts` — shared Prisma client singleton
- `prisma/schema.prisma` — domain model: users/roles, exams/questions/
  attempts, EduCom courses/lessons/enrollments/certificates, subscriptions/
  payments/vouchers/referrals
- `prisma/seed.ts` — sample question bank (WAEC/UTME, 5 subjects) and two
  full EduCom courses with modules and lessons

## Roles

`STUDENT`, `PARENT`, `SCHOOL_ADMIN`, `SPONSOR`, `PARTNER`, `ADMIN` — each has
its own dashboard under `/dashboard/*`, routed via `src/lib/roles.ts`.

## Status

Working end-to-end: auth, the CBT practice/mock-exam engine (scored, with
per-question explanations), the EduCom course player (enrollment, lesson
progress, certificates), and Paystack subscription checkout. Not yet built:
parent/school/sponsor data views (currently placeholder dashboards), admin
tooling, referrals/vouchers, and AI-powered recommendations.
