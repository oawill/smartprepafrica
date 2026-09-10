import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { INTERNATIONAL_EXAM_LANDING_PATH } from "@/lib/international-exams/pricing";
import { isToeflEnabled } from "@/lib/toefl/config";
import { isSatEnabled } from "@/lib/sat/config";
import { prisma } from "@/lib/prisma";
import { getFeaturedNigerianStates } from "@/lib/nigerian-states";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const examCodes = ["WAEC", "NECO", "UTME", "Post-UTME"] as const;

const discoverySubjects = ["Mathematics", "English Language", "Physics", "Chemistry", "Biology"];

export const metadata: Metadata = {
  description:
    "Prepare for WAEC, NECO, UTME, and Post-UTME with SmartPrepAfrica's AI study coach — now also offering TOEFL and SAT preparation for students planning to study abroad.",
};

export default async function Home() {
  const showToefl = isToeflEnabled();
  const showSat = isSatEnabled();
  const showInternationalExams = showToefl || showSat;

  const locale = await getLocale();
  const t = getDictionary(locale).home;

  // Real counts only — never fabricated. Used for the Learning section below.
  const [schoolsWithCourses, publishedCourseCount, upcomingLiveClasses, discoveryStates] =
    await Promise.all([
      prisma.school.count({ where: { courses: { some: { published: true } } } }),
      prisma.course.count({ where: { published: true } }),
      prisma.liveClass.findMany({
        where: { course: { published: true }, scheduledAt: { gte: new Date() } },
        include: { course: { select: { title: true, school: { select: { name: true } } } } },
        orderBy: { scheduledAt: "asc" },
        take: 3,
      }),
      getFeaturedNigerianStates(),
    ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-display font-semibold leading-tight text-text-primary">
            {t.heroTitlePart1}{" "}
            <span className="text-success">{t.heroTitlePart2}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">{t.heroSubtitle}</p>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-text-muted">{t.heroTagline}</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              {t.startPreparingFree}
            </Link>
            <Link
              href="/learn"
              className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
            >
              {t.exploreLearning}
            </Link>
          </div>

          {showInternationalExams && (
            <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-5 py-3 text-center sm:flex-row sm:justify-center sm:gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-foreground">
                  {t.newBadge}
                </span>
                {t.toeflSatPrep}
              </span>
              <span className="hidden text-text-muted sm:inline">·</span>
              <span className="text-sm text-text-secondary">{t.internationalOpportunities}</span>
              <Link href="#go-beyond-borders" className="text-sm font-medium text-brand-text hover:underline">
                {t.exploreInternationalExams}
              </Link>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <HeroCarousel />
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">{t.allExamsOnePlace}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {examCodes.map((code) => (
              <div
                key={code}
                className="rounded-xl border border-border bg-surface-raised p-5"
              >
                <p className="font-semibold text-brand-text">{code}</p>
                <p className="mt-2 text-sm text-text-secondary">{t.examDescriptions[code]}</p>
              </div>
            ))}
          </div>
        </section>

        {showInternationalExams && (
          <section id="go-beyond-borders" className="mx-auto max-w-6xl px-6 py-16">
            <div className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center">
              <span className="text-xs font-medium text-brand-text">{t.goBeyondBordersLabel}</span>
              <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
                {t.goBeyondBordersTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">{t.goBeyondBordersBody}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {showSat && (
                  <Link
                    href={INTERNATIONAL_EXAM_LANDING_PATH.SAT}
                    className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                  >
                    {t.exploreSatPrep}
                  </Link>
                )}
                {showToefl && (
                  <Link
                    href={INTERNATIONAL_EXAM_LANDING_PATH.TOEFL}
                    className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
                  >
                    {t.exploreToeflPrep}
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
            <span className="text-xs font-medium text-success">{t.learningLabel}</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
              {t.learnBeyondPart1}{" "}
              <span className="text-success">{t.learnBeyondPart2}</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">{t.learningBody}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-text-muted">{t.learningTagline}</p>
            {(schoolsWithCourses > 0 || publishedCourseCount > 0) && (
              <p className="mt-3 text-xs text-text-muted">
                {t.schoolsAndCoursesCount(schoolsWithCourses, publishedCourseCount)}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/learn"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                {t.exploreClasses}
              </Link>
              <Link
                href="/learn/schools"
                className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
              >
                {t.viewSchools}
              </Link>
              {upcomingLiveClasses.length > 0 && (
                <Link
                  href="/learn"
                  className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
                >
                  {t.joinLiveClass}
                </Link>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-text-muted">
              <Link href="/register" className="hover:text-text-secondary">
                {t.teachOnSmartPrep}
              </Link>
              <Link href="/register" className="hover:text-text-secondary">
                {t.sponsorAStudent}
              </Link>
            </div>
          </div>

          {upcomingLiveClasses.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {upcomingLiveClasses.map((lc) => (
                <Link
                  key={lc.id}
                  href="/learn"
                  className="rounded-xl border border-border bg-surface-raised p-4 hover:border-border-strong"
                >
                  <span className="inline-block rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                    {t.upcoming}
                  </span>
                  <p className="mt-2 text-sm font-medium text-text-primary">{lc.title}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {lc.course.title}
                    {lc.course.school && ` · ${lc.course.school.name}`}
                  </p>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-center text-sm font-medium text-text-secondary">
              {t.exploreLearningAcrossNigeria}
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="text-xs uppercase tracking-wide text-text-muted">{t.byState}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {discoveryStates.map((state) => (
                    <Link
                      key={state}
                      href={`/learn/schools?state=${encodeURIComponent(state)}`}
                      className="rounded-full border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-brand hover:text-brand-text"
                    >
                      {state}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="text-xs uppercase tracking-wide text-text-muted">{t.bySubject}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {discoverySubjects.map((subject) => (
                    <Link
                      key={subject}
                      href={`/learn/schools?subject=${encodeURIComponent(subject)}`}
                      className="rounded-full border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-brand hover:text-brand-text"
                    >
                      {subject}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
            <span className="text-xs font-medium text-brand-text">{t.aiSupportLabel}</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
              {t.aiSupportTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">{t.aiSupportBody}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                {t.tryAiStudyCoach}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-h2 font-semibold text-text-primary">{t.whyTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-text-secondary">{t.whySubtitle}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.whyItems.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="font-semibold text-text-primary">{item.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
            <span className="text-xs font-medium text-brand-text">{t.partnersLabel}</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
              {t.partnersTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">{t.partnersBody}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/partners"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                {t.becomeAPartner}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
            <h2 className="mx-auto max-w-2xl text-h1 font-semibold text-text-primary">
              {t.findPlanTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">{t.findPlanBody}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/pricing"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                {t.viewPlansAndPricing}
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
              >
                {t.startLearning}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
