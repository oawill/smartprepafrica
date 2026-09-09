import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getNigerianStates } from "@/lib/nigerian-states";

export default async function SearchPage({
  searchParams,
}: PageProps<"/learn/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  // Light heuristic for compound queries like "Mathematics Rivers State":
  // pull out a recognized state name and search the remainder as text.
  const nigerianStates = await getNigerianStates();
  const matchedState = nigerianStates.find((s) =>
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
            archived: false,
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
      <Link href="/learn" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Courses
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">Search Courses</h1>

      <form method="GET" className="mt-6">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Try “Mathematics” or “Mathematics Rivers State”…"
          className="w-full rounded-lg border border-border-strong bg-surface px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
        />
      </form>

      {!hasQuery ? (
        <p className="mt-8 text-sm text-text-secondary">
          Search across courses, schools, and teachers.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-sm font-medium text-text-secondary">
              Courses {courses.length > 0 && `(${courses.length})`}
            </h2>
            {courses.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">No matching courses.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {courses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/learn/${c.id}`}
                    className="rounded-lg border border-border bg-surface-raised p-3 text-sm hover:border-border-strong"
                  >
                    <p className="text-text-primary">{c.title}</p>
                    <p className="mt-1 text-xs text-text-muted">
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
            <h2 className="text-sm font-medium text-text-secondary">
              Schools {schools.length > 0 && `(${schools.length})`}
            </h2>
            {schools.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">No matching schools.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {schools.map((s) => (
                  <Link
                    key={s.id}
                    href={`/learn/schools/${s.id}`}
                    className="rounded-lg border border-border bg-surface-raised p-3 text-sm hover:border-border-strong"
                  >
                    <p className="text-text-primary">{s.name}</p>
                    <p className="mt-1 text-xs text-text-muted">{s.state ?? "Nigeria"}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium text-text-secondary">
              Teachers {teachers.length > 0 && `(${teachers.length})`}
            </h2>
            {teachers.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">No matching teachers.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {teachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/learn/teachers/${t.id}`}
                    className="rounded-lg border border-border bg-surface-raised p-3 text-sm hover:border-border-strong"
                  >
                    <p className="text-text-primary">{t.user.name}</p>
                    <p className="mt-1 text-xs text-text-muted">
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
