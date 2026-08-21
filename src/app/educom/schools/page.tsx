import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { getSchoolRating, formatRating } from "@/lib/ratings";

export default async function SchoolsDirectoryPage({
  searchParams,
}: PageProps<"/educom/schools">) {
  const { state, subject } = await searchParams;
  const stateFilter = typeof state === "string" ? state : "";
  const subjectFilter = typeof subject === "string" ? subject : "";

  const [schools, subjects] = await Promise.all([
    prisma.school.findMany({
      where: {
        ...(stateFilter ? { state: stateFilter } : {}),
        ...(subjectFilter
          ? { courses: { some: { published: true, subject: { name: subjectFilter } } } }
          : {}),
      },
      include: {
        _count: { select: { courses: { where: { published: true } }, teachers: true } },
        courses: {
          where: { published: true },
          select: { subject: { select: { name: true } }, _count: { select: { enrollments: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);

  const ratings = await Promise.all(schools.map((s) => getSchoolRating(s.id)));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/educom" className="text-sm text-slate-400 hover:text-white">
        ← Back to Courses
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Explore schools</h1>
      <p className="mt-2 max-w-2xl text-slate-400">
        Your school decides where you&apos;re enrolled — not where you can
        learn. Browse participating schools from across Nigeria and take
        classes from their teachers, wherever you are.
      </p>

      <form method="GET" className="mt-6 flex flex-wrap gap-2">
        <select
          name="state"
          defaultValue={stateFilter}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
        >
          <option value="">Any state</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="subject"
          defaultValue={subjectFilter}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
        >
          <option value="">Any subject</option>
          {subjects.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          Filter
        </button>
      </form>

      {schools.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">
          No schools match those filters yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((school, i) => {
            const subjectNames = [...new Set(school.courses.map((c) => c.subject?.name).filter(Boolean))];
            const learners = school.courses.reduce((sum, c) => sum + c._count.enrollments, 0);
            return (
              <Link
                key={school.id}
                href={`/educom/schools/${school.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-600"
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-slate-100">{school.name}</p>
                  {school.verified && (
                    <span className="shrink-0 rounded-full bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300">
                      Verified
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{school.state ?? "Nigeria"}</p>
                {school.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{school.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {subjectNames.slice(0, 4).map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {school._count.courses} course{school._count.courses === 1 ? "" : "s"} ·{" "}
                  {learners} learner{learners === 1 ? "" : "s"} ·{" "}
                  {formatRating(ratings[i])}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
