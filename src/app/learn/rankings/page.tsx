import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function RankingsPage({
  searchParams,
}: PageProps<"/learn/rankings">) {
  const { subject } = await searchParams;
  const subjectFilter = typeof subject === "string" ? subject : "";

  const [subjects, courses, schools, teachers, trending, newCourses] = await Promise.all([
    prisma.subject.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({
      where: {
        published: true,
        archived: false,
        ...(subjectFilter ? { subject: { name: subjectFilter } } : {}),
      },
      include: {
        school: { select: { id: true, name: true, state: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.school.findMany({
      include: {
        courses: {
          where: {
            published: true,
            archived: false,
            ...(subjectFilter ? { subject: { name: subjectFilter } } : {}),
          },
          select: { reviews: { select: { rating: true } } },
        },
      },
    }),
    prisma.teacherProfile.findMany({
      include: {
        user: { select: { name: true } },
        school: { select: { name: true, state: true } },
        courses: {
          where: {
            published: true,
            archived: false,
            ...(subjectFilter ? { subject: { name: subjectFilter } } : {}),
          },
          select: { reviews: { select: { rating: true } } },
        },
      },
    }),
    prisma.course.findMany({
      where: { published: true, archived: false, ...(subjectFilter ? { subject: { name: subjectFilter } } : {}) },
      include: {
        school: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { enrollments: { _count: "desc" } },
      take: 5,
    }),
    prisma.course.findMany({
      where: { published: true, archived: false, ...(subjectFilter ? { subject: { name: subjectFilter } } : {}) },
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  function avgRating(reviews: { rating: number }[]) {
    if (reviews.length === 0) return null;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }

  const ratedCourses = courses
    .map((c) => ({ course: c, avg: avgRating(c.reviews), count: c.reviews.length }))
    .filter((c) => c.avg !== null)
    .sort((a, b) => b.avg! - a.avg!)
    .slice(0, 5);

  const ratedSchools = schools
    .map((s) => {
      const allReviews = s.courses.flatMap((c) => c.reviews);
      return { school: s, avg: avgRating(allReviews), count: allReviews.length };
    })
    .filter((s) => s.avg !== null && s.school.courses.length > 0)
    .sort((a, b) => b.avg! - a.avg!)
    .slice(0, 5);

  const ratedTeachers = teachers
    .map((t) => {
      const allReviews = t.courses.flatMap((c) => c.reviews);
      return { teacher: t, avg: avgRating(allReviews), count: allReviews.length };
    })
    .filter((t) => t.avg !== null && t.teacher.courses.length > 0)
    .sort((a, b) => b.avg! - a.avg!)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/learn" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Courses
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Discover on SmartPrepAfrica.com</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Rankings here are based only on verified SmartPrepAfrica.com activity — real
        learner ratings and real enrollment — never an unverified
        &quot;best school&quot; claim.
      </p>

      <form method="GET" className="mt-6">
        <select
          name="subject"
          defaultValue={subjectFilter}
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="ml-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Filter
        </button>
      </form>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Highly Rated {subjectFilter ? `${subjectFilter} ` : ""}Courses on SmartPrepAfrica.com
        </h2>
        {ratedCourses.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Not enough reviews yet to rank courses.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {ratedCourses.map(({ course, avg, count }) => (
              <Link
                key={course.id}
                href={`/learn/${course.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm hover:border-border-strong"
              >
                <span>
                  {course.title}
                  <span className="ml-2 text-xs text-text-muted">
                    {course.school?.name}
                    {course.school?.state && ` — ${course.school.state}`}
                  </span>
                </span>
                <span className="text-brand-text">
                  {avg!.toFixed(1)} ★ ({count})
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Highly Rated {subjectFilter ? `${subjectFilter} ` : ""}Schools on SmartPrepAfrica.com
        </h2>
        {ratedSchools.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Not enough reviews yet to rank schools.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {ratedSchools.map(({ school, avg, count }) => (
              <Link
                key={school.id}
                href={`/learn/schools/${school.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm hover:border-border-strong"
              >
                <span>
                  {school.name}
                  <span className="ml-2 text-xs text-text-muted">{school.state}</span>
                </span>
                <span className="text-brand-text">
                  {avg!.toFixed(1)} ★ ({count})
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Highest Rated Teachers</h2>
        {ratedTeachers.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Not enough reviews yet to rank teachers.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {ratedTeachers.map(({ teacher, avg, count }) => (
              <Link
                key={teacher.id}
                href={`/learn/teachers/${teacher.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm hover:border-border-strong"
              >
                <span>
                  {teacher.user.name}
                  <span className="ml-2 text-xs text-text-muted">{teacher.school?.name}</span>
                </span>
                <span className="text-brand-text">
                  {avg!.toFixed(1)} ★ ({count})
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Trending Courses</h2>
        {trending.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No enrollments yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {trending.map((c) => (
              <Link
                key={c.id}
                href={`/learn/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm hover:border-border-strong"
              >
                <span>{c.title}</span>
                <span className="text-text-muted">{c._count.enrollments} learners</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Best New Courses</h2>
        <div className="mt-3 space-y-2">
          {newCourses.map((c) => (
            <Link
              key={c.id}
              href={`/learn/${c.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm hover:border-border-strong"
            >
              <span>{c.title}</span>
              <span className="text-text-muted">{c.school?.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
