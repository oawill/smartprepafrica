import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";

export default async function SearchPage({
  searchParams,
}: PageProps<"/educom/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  // Light heuristic for compound queries like "Mathematics Rivers State":
  // pull out a recognized state name and search the remainder as text.
  const matchedState = NIGERIAN_STATES.find((s) =>
    query.toLowerCase().includes(s.toLowerCase())
  );
  const textQuery = matchedState
    ? query.toLowerCase().replace(matchedState.toLowerCase(), "").replace(/\bstate\b/gi, "").trim()
    : query;

  const hasQuery = query.length > 0;

  const [courses, schools, teachers] = hasQuery
    ? await Promise.all([
        prisma.course.findMany({
          where: {
            published: true,
            ...(textQuery ? { title: { contains: textQuery, mode: "insensitive" } } : {}),
            ...(matchedState ? { school: { state: matchedState } } : {}),
          },
          include: {
            school: { select: { id: true, name: true, state: true } },
            _count: { select: { enrollments: true } },
          },
          take: 10,
        }),
        prisma.school.findMany({
          where: {
            ...(textQuery ? { name: { contains: textQuery, mode: "insensitive" } } : {}),
            ...(matchedState ? { state: matchedState } : {}),
          },
          take: 10,
        }),
        prisma.teacherProfile.findMany({
          where: {
            ...(textQuery ? { user: { name: { contains: textQuery, mode: "insensitive" } } } : {}),
            ...(matchedState ? { school: { state: matchedState } } : {}),
          },
          include: {
            user: { select: { name: true } },
            school: { select: { name: true, state: true } },
          },
          take: 10,
        }),
      ])
    : [[], [], []];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/educom" className="text-sm text-slate-400 hover:text-white">
        ← Back to Courses
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Search Courses</h1>

      <form method="GET" className="mt-6">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Try “Mathematics” or “Mathematics Rivers State”…"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-500"
        />
      </form>

      {!hasQuery ? (
        <p className="mt-8 text-sm text-slate-400">
          Search across courses, schools, and teachers.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-sm font-medium text-slate-300">
              Courses {courses.length > 0 && `(${courses.length})`}
            </h2>
            {courses.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No matching courses.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {courses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/educom/${c.id}`}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm hover:border-slate-600"
                  >
                    <p className="text-slate-100">{c.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.school ? `${c.school.name}${c.school.state ? ` — ${c.school.state}` : ""}` : "SmartPrepAfrica"}
                      {" · "}
                      {c._count.enrollments} learner{c._count.enrollments === 1 ? "" : "s"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium text-slate-300">
              Schools {schools.length > 0 && `(${schools.length})`}
            </h2>
            {schools.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No matching schools.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {schools.map((s) => (
                  <Link
                    key={s.id}
                    href={`/educom/schools/${s.id}`}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm hover:border-slate-600"
                  >
                    <p className="text-slate-100">{s.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{s.state ?? "Nigeria"}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium text-slate-300">
              Teachers {teachers.length > 0 && `(${teachers.length})`}
            </h2>
            {teachers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No matching teachers.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {teachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/educom/teachers/${t.id}`}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm hover:border-slate-600"
                  >
                    <p className="text-slate-100">{t.user.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t.school ? `${t.school.name}${t.school.state ? ` — ${t.school.state}` : ""}` : "Independent"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
