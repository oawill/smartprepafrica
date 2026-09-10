import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Difficulty } from "@prisma/client";
import { LearnHub } from "@/components/learn/learn-hub";

const difficulties: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

type CourseCard = {
  id: string;
  title: string;
  instructorName: string | null;
  difficulty: Difficulty | null;
  estimatedMinutes: number | null;
  requiresSubscription: boolean;
  _count: { modules: number; enrollments: number };
};

function CourseCardLink({ course }: { course: CourseCard }) {
  return (
    <Link
      href={`/learn/${course.id}`}
      className="block rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-secondary hover:border-border-strong"
    >
      <span className="font-medium text-text-primary">{course.title}</span>
      <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-text-muted">
        {course.instructorName && <span>{course.instructorName}</span>}
        {course.difficulty && <span>· {course.difficulty}</span>}
        {course.estimatedMinutes && <span>· {course.estimatedMinutes} min</span>}
        <span>
          · {course.requiresSubscription ? "Included with subscription" : "Free"}
        </span>
        <span>
          · {course._count.enrollments} learner{course._count.enrollments === 1 ? "" : "s"}
        </span>
      </span>
    </Link>
  );
}

function timeUntil(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  const hours = Math.round(ms / (60 * 60 * 1000));
  if (hours < 1) return "starting now";
  if (hours < 24) return `starts in ${hours}h`;
  return `starts in ${Math.round(hours / 24)}d`;
}

export default async function LearnPage({
  searchParams,
}: PageProps<"/learn">) {
  const { q, difficulty, price, subjectId, classLevelId } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const difficultyFilter = typeof difficulty === "string" ? difficulty : "";
  const priceFilter = typeof price === "string" ? price : "";
  const subjectIdFilter = typeof subjectId === "string" ? subjectId : "";
  const classLevelIdFilter = typeof classLevelId === "string" ? classLevelId : "";

  const session = await auth();

  const now = new Date();

  const [courses, upcomingLiveClasses, courseCountsBySubject, subjects, classLevels, programmes] = await Promise.all([
    prisma.course.findMany({
      where: {
        published: true,
        archived: false,
        ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
        ...(difficultyFilter ? { difficulty: difficultyFilter as Difficulty } : {}),
        ...(priceFilter === "free" ? { requiresSubscription: false } : {}),
        ...(priceFilter === "paid" ? { requiresSubscription: true } : {}),
        ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
        ...(classLevelIdFilter ? { classLevelId: classLevelIdFilter } : {}),
      },
      include: {
        subject: { select: { name: true } },
        _count: { select: { modules: true, enrollments: true } },
      },
      orderBy: { title: "asc" },
    }),
    // "Live Now / Starting Soon" — real scheduled sessions, never fabricated.
    // A class still counts as live for the length of its stated duration.
    prisma.liveClass.findMany({
      where: {
        course: { published: true, archived: false },
        scheduledAt: { gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      },
      include: {
        course: {
          select: {
            title: true,
            school: { select: { id: true, name: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 6,
    }),
    prisma.course.groupBy({
      by: ["subjectId"],
      where: { published: true, archived: false, subjectId: { not: null } },
      _count: { _all: true },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.classLevel.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: { curriculum: { select: { name: true } }, _count: { select: { courses: true } } },
    }),
    prisma.programme.findMany({
      where: { published: true },
      include: { _count: { select: { courses: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const courseCountBySubjectId = new Map(courseCountsBySubject.map((c) => [c.subjectId, c._count._all]));

  const coreSecondary = courses.filter((c) => c.subjectId);
  const examPrep = courses.filter((c) => c.examType && !c.subjectId);

  const coreBySubject = new Map<string, typeof coreSecondary>();
  for (const c of coreSecondary) {
    const name = c.subject!.name;
    coreBySubject.set(name, [...(coreBySubject.get(name) ?? []), c]);
  }

  const examByType = new Map<string, typeof examPrep>();
  for (const c of examPrep) {
    examByType.set(c.examType!, [...(examByType.get(c.examType!) ?? []), c]);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back home
      </Link>
      <span className="mt-4 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-text">
        SmartPrepAfrica Learning
      </span>
      <h1 className="mt-3 text-h1 font-semibold text-text-primary">Learn Beyond Your School</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Great teaching shouldn&apos;t depend on where you go to school. Join live classes,
        courses and masterclasses from schools and teachers across Nigeria — one platform,
        many schools, more opportunities.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/learn/schools"
          className="inline-block rounded-full border border-border-strong px-4 py-2 text-sm text-text-primary hover:border-text-muted"
        >
          View Schools →
        </Link>
        <Link
          href="/learn/search"
          className="inline-block rounded-full border border-border-strong px-4 py-2 text-sm text-text-primary hover:border-text-muted"
        >
          Search →
        </Link>
        <Link
          href="/learn/rankings"
          className="inline-block rounded-full border border-border-strong px-4 py-2 text-sm text-text-primary hover:border-text-muted"
        >
          Popular this week →
        </Link>
        <Link
          href="/learn/programmes"
          className="inline-block rounded-full border border-border-strong px-4 py-2 text-sm text-text-primary hover:border-text-muted"
        >
          Programmes →
        </Link>
        <Link
          href="/practice"
          className="inline-block rounded-full border border-border-strong px-4 py-2 text-sm text-text-primary hover:border-text-muted"
        >
          SmartPrepAfrica Prep →
        </Link>
      </div>

      {session?.user.role === "STUDENT" && <LearnHub userId={session.user.id} />}

      {upcomingLiveClasses.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text-primary">Live Now / Starting Soon</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingLiveClasses.map((lc) => {
              const isLive =
                now >= lc.scheduledAt && now.getTime() <= lc.scheduledAt.getTime() + lc.durationMinutes * 60000;
              return (
                <div key={lc.id} className="rounded-xl border border-border bg-surface-raised p-4">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isLive ? "bg-danger text-danger-foreground" : "bg-surface-sunken text-text-secondary"
                    }`}
                  >
                    {isLive ? "Live" : timeUntil(lc.scheduledAt, now)}
                  </span>
                  <p className="mt-2 font-medium text-text-primary">{lc.title}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {lc.course.title}
                    {lc.course.teacher && ` · ${lc.course.teacher.user.name}`}
                  </p>
                  {lc.course.school && (
                    <Link
                      href={`/learn/schools/${lc.course.school.id}`}
                      className="mt-1 inline-block text-xs text-brand-text hover:underline"
                    >
                      {lc.course.school.name}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {classLevels.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text-primary">Browse by Grade Level</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {classLevels.map((cl) => (
              <Link
                key={cl.id}
                href={`/learn/class/${cl.id}`}
                className={`rounded-full border px-4 py-2 text-sm hover:border-brand hover:text-brand-text ${
                  classLevelIdFilter === cl.id
                    ? "border-brand text-brand-text"
                    : "border-border-strong text-text-secondary"
                }`}
              >
                {cl.name}
                <span className="ml-1.5 text-text-muted">({cl._count.courses})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {subjects.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text-primary">Explore by Subject</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <Link
                key={subject.id}
                href={`/learn?subjectId=${subject.id}`}
                className={`rounded-full border px-4 py-2 text-sm hover:border-brand hover:text-brand-text ${
                  subjectIdFilter === subject.id
                    ? "border-brand text-brand-text"
                    : "border-border-strong text-text-secondary"
                }`}
              >
                {subject.name}
                <span className="ml-1.5 text-text-muted">
                  ({courseCountBySubjectId.get(subject.id) ?? 0})
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(subjectIdFilter || classLevelIdFilter) && (
        <p className="mt-6 text-sm text-text-secondary">
          Filtered by {subjectIdFilter && classLevelIdFilter ? "subject and grade level" : subjectIdFilter ? "subject" : "grade level"}.{" "}
          <Link href="/learn" className="text-brand-text hover:underline">
            Clear filter
          </Link>
        </p>
      )}

      <form method="GET" className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="subjectId" value={subjectIdFilter} />
        <input type="hidden" name="classLevelId" value={classLevelIdFilter} />
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search courses…"
          className="flex-1 min-w-[200px] rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
        />
        <select
          name="difficulty"
          defaultValue={difficultyFilter}
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
        >
          <option value="">Any difficulty</option>
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          name="price"
          defaultValue={priceFilter}
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
        >
          <option value="">Free & paid</option>
          <option value="free">Free only</option>
          <option value="paid">Paid only</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Filter
        </button>
      </form>

      {courses.length === 0 && (
        <p className="mt-8 text-sm text-text-secondary">
          No courses match your search. Try clearing the filters.
        </p>
      )}

      {programmes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text-primary">Programmes</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Bundles of courses that lead to their own certificate once you complete every course inside.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {programmes.map((p) => (
              <Link
                key={p.id}
                href={`/learn/programmes/${p.id}`}
                className="block rounded-xl border border-border bg-surface-raised p-4 hover:border-border-strong"
              >
                <p className="font-medium text-text-primary">{p.title}</p>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{p.description}</p>
                )}
                <p className="mt-2 text-xs text-text-muted">
                  {p._count.courses} course{p._count.courses === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {coreSecondary.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text-primary">Core Secondary School</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...coreBySubject.entries()].map(([subjectName, list]) => (
              <div key={subjectName} className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="font-medium">{subjectName}</p>
                <div className="mt-2 space-y-2">
                  {list.map((c) => (
                    <CourseCardLink key={c.id} course={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {examPrep.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text-primary">Exam Preparation</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...examByType.entries()].map(([examType, list]) => (
              <div key={examType} className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="font-medium">{examType.replace("_", "-")}</p>
                <div className="mt-2 space-y-2">
                  {list.map((c) => (
                    <CourseCardLink key={c.id} course={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
