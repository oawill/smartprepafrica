import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { INTERNATIONAL_EXAM_LANDING_PATH } from "@/lib/international-exams/pricing";
import { isToeflEnabled } from "@/lib/toefl/config";
import { isSatEnabled } from "@/lib/sat/config";
import { prisma } from "@/lib/prisma";

const exams = [
  { code: "WAEC", desc: "West African Senior School Certificate Examination" },
  { code: "NECO", desc: "National Examinations Council" },
  { code: "UTME", desc: "Unified Tertiary Matriculation Examination" },
  { code: "Post-UTME", desc: "Post-UTME screening for your target institution" },
];

const discoveryStates = ["Lagos", "Rivers", "Kano", "FCT", "Oyo", "Enugu"];
const discoverySubjects = ["Mathematics", "English Language", "Physics", "Chemistry", "Biology"];

const whySmartPrep = [
  {
    title: "Local + International Exams",
    body: "Prepare for WAEC, NECO, UTME/JAMB, SAT and TOEFL from one platform.",
  },
  {
    title: "Practice That Builds Confidence",
    body: "Use focused drills, mock exams, explanations and performance tracking to identify areas that need improvement.",
  },
  {
    title: "AI-Powered Learning",
    body: "Get additional study support through SmartPrepAfrica's AI learning tools.",
  },
  {
    title: "Learn Anywhere",
    body: "A mobile-friendly learning experience designed for students studying at home, school or on the go.",
  },
];

export const metadata: Metadata = {
  description:
    "Prepare for WAEC, NECO, UTME, and Post-UTME with SmartPrepAfrica's AI study coach — now also offering TOEFL and SAT preparation for students planning to study abroad.",
};

export default async function Home() {
  const showToefl = isToeflEnabled();
  const showSat = isSatEnabled();
  const showInternationalExams = showToefl || showSat;

  // Real counts only — never fabricated. Used for the Learning section below.
  const [schoolsWithCourses, publishedCourseCount, upcomingLiveClasses] = await Promise.all([
    prisma.school.count({ where: { courses: { some: { published: true } } } }),
    prisma.course.count({ where: { published: true } }),
    prisma.liveClass.findMany({
      where: { course: { published: true }, scheduledAt: { gte: new Date() } },
      include: { course: { select: { title: true, school: { select: { name: true } } } } },
      orderBy: { scheduledAt: "asc" },
      take: 3,
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-display font-semibold leading-tight text-text-primary">
            Prepare smarter. Pass better.{" "}
            <span className="text-success">Achieve more.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            SmartPrepAfrica Prep helps Nigerian students master WAEC, NECO, UTME
            and Post-UTME with an AI study coach. SmartPrepAfrica Learning connects
            students with live classes and courses from schools across Nigeria.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-text-muted">
            Prepare Smarter. Learn Better. Succeed Anywhere. — SmartPrepAfrica helps
            African students prepare for the exams that shape their future.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Start preparing free
            </Link>
            <Link
              href="/educom"
              className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
            >
              Explore Learning
            </Link>
          </div>

          {showInternationalExams && (
            <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-5 py-3 text-center sm:flex-row sm:justify-center sm:gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-foreground">
                  New
                </span>
                TOEFL &amp; SAT Prep
              </span>
              <span className="hidden text-text-muted sm:inline">·</span>
              <span className="text-sm text-text-secondary">
                Prepare for international opportunities with SmartPrepAfrica.
              </span>
              <Link href="#go-beyond-borders" className="text-sm font-medium text-brand-text hover:underline">
                Explore International Exams →
              </Link>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <HeroCarousel />
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">
            All major exams, one place.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {exams.map((exam) => (
              <div
                key={exam.code}
                className="rounded-xl border border-border bg-surface-raised p-5"
              >
                <p className="font-semibold text-brand-text">{exam.code}</p>
                <p className="mt-2 text-sm text-text-secondary">{exam.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {showInternationalExams && (
          <section id="go-beyond-borders" className="mx-auto max-w-6xl px-6 py-16">
            <div className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center">
              <span className="text-xs font-medium text-brand-text">International Exams</span>
              <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
                Go Beyond Borders
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
                Preparing for university or opportunities abroad? Build your SAT and TOEFL skills
                with structured practice, targeted drills, mock exams and performance insights.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {showSat && (
                  <Link
                    href={INTERNATIONAL_EXAM_LANDING_PATH.SAT}
                    className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                  >
                    Explore SAT Prep
                  </Link>
                )}
                {showToefl && (
                  <Link
                    href={INTERNATIONAL_EXAM_LANDING_PATH.TOEFL}
                    className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
                  >
                    Explore TOEFL Prep
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
            <span className="text-xs font-medium text-success">SmartPrepAfrica Learning</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
              Learn Beyond{" "}
              <span className="text-success">Your School.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
              Great teaching shouldn&apos;t depend on where you go to school. SmartPrepAfrica
              Learning connects secondary-school students with live classes, courses and
              outstanding teachers from schools across Nigeria. Strengthen a subject, prepare
              for an exam, join a masterclass, or learn from educators outside your own school.
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              One platform. Many schools. More opportunities.
            </p>
            {(schoolsWithCourses > 0 || publishedCourseCount > 0) && (
              <p className="mt-3 text-xs text-text-muted">
                {schoolsWithCourses} school{schoolsWithCourses === 1 ? "" : "s"} · {publishedCourseCount} live
                course{publishedCourseCount === 1 ? "" : "s"} and counting
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/educom"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Explore Classes
              </Link>
              <Link
                href="/educom/schools"
                className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
              >
                View Schools
              </Link>
              {upcomingLiveClasses.length > 0 && (
                <Link
                  href="/educom"
                  className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
                >
                  Join a Live Class
                </Link>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-text-muted">
              <Link href="/register" className="hover:text-text-secondary">
                Teach on SmartPrepAfrica.com →
              </Link>
              <Link href="/register" className="hover:text-text-secondary">
                Sponsor a Student →
              </Link>
            </div>
          </div>

          {upcomingLiveClasses.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {upcomingLiveClasses.map((lc) => (
                <Link
                  key={lc.id}
                  href="/educom"
                  className="rounded-xl border border-border bg-surface-raised p-4 hover:border-border-strong"
                >
                  <span className="inline-block rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                    Upcoming
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
              Explore learning across Nigeria
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="text-xs uppercase tracking-wide text-text-muted">By state</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {discoveryStates.map((state) => (
                    <Link
                      key={state}
                      href={`/educom/schools?state=${encodeURIComponent(state)}`}
                      className="rounded-full border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-brand hover:text-brand-text"
                    >
                      {state}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="text-xs uppercase tracking-wide text-text-muted">By subject</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {discoverySubjects.map((subject) => (
                    <Link
                      key={subject}
                      href={`/educom/schools?subject=${encodeURIComponent(subject)}`}
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
            <span className="text-xs font-medium text-brand-text">AI Study Support</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
              Never Get Stuck on a Question
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
              SmartPrepAfrica&apos;s AI Study Coach gives instant explanations and personalized help
              whenever you&apos;re practicing — so you understand your mistakes, not just move past them.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Try AI Study Coach
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-h2 font-semibold text-text-primary">Why SmartPrepAfrica?</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-text-secondary">
            Built for African Students
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whySmartPrep.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="font-semibold text-text-primary">{item.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
            <span className="text-xs font-medium text-brand-text">SmartPrepAfrica.com Partners</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
              Schools &amp; Institutions, Partner With Us
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
              Bring SmartPrepAfrica to your students. Refer students and schools to
              SmartPrepAfrica.com and get rewarded for the ones who stick around.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/partners"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Become a Partner
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
            <h2 className="mx-auto max-w-2xl text-h1 font-semibold text-text-primary">
              Find the Right Plan for You
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
              Choose exam preparation and learning options designed for your goals.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/pricing"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                View Plans &amp; Pricing
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
              >
                Start Learning
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
