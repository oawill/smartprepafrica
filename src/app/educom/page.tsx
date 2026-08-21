import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { CourseCategory, Difficulty } from "@prisma/client";
import { formatNaira } from "@/lib/plans";
import { LearnHub } from "@/components/educom/learn-hub";

const skillCategories: { key: CourseCategory; label: string }[] = [
  { key: "ACADEMIC", label: "Academic" },
  { key: "CAREER_DEVELOPMENT", label: "Career development" },
  { key: "TECHNOLOGY", label: "Technology" },
  { key: "AI", label: "AI" },
  { key: "CODING", label: "Coding" },
  { key: "FINANCIAL_LITERACY", label: "Financial literacy" },
  { key: "COMMUNICATION", label: "Communication" },
  { key: "LEADERSHIP", label: "Leadership" },
  { key: "MINDSET", label: "Mindset" },
  { key: "DISCIPLINE", label: "Discipline" },
  { key: "LIFE_SKILLS", label: "Life skills" },
];

const difficulties: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

type CourseCard = {
  id: string;
  title: string;
  instructorName: string | null;
  difficulty: Difficulty | null;
  estimatedMinutes: number | null;
  priceKobo: number | null;
  _count: { modules: number; enrollments: number };
};

function CourseCardLink({ course }: { course: CourseCard }) {
  return (
    <Link
      href={`/educom/${course.id}`}
      className="block rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 hover:border-slate-600"
    >
      <span className="font-medium text-slate-100">{course.title}</span>
      <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-500">
        {course.instructorName && <span>{course.instructorName}</span>}
        {course.difficulty && <span>· {course.difficulty}</span>}
        {course.estimatedMinutes && <span>· {course.estimatedMinutes} min</span>}
        <span>
          · {course.priceKobo ? formatNaira(course.priceKobo) : "Free"}
        </span>
        <span>
          · {course._count.enrollments} learner{course._count.enrollments === 1 ? "" : "s"}
        </span>
      </span>
    </Link>
  );
}

export default async function EduComPage({
  searchParams,
}: PageProps<"/educom">) {
  const { q, difficulty, price } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const difficultyFilter = typeof difficulty === "string" ? difficulty : "";
  const priceFilter = typeof price === "string" ? price : "";

  const session = await auth();

  const courses = await prisma.course.findMany({
    where: {
      published: true,
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(difficultyFilter ? { difficulty: difficultyFilter as Difficulty } : {}),
      ...(priceFilter === "free" ? { OR: [{ priceKobo: null }, { priceKobo: 0 }] } : {}),
      ...(priceFilter === "paid" ? { priceKobo: { gt: 0 } } : {}),
    },
    include: {
      subject: { select: { name: true } },
      _count: { select: { modules: true, enrollments: true } },
    },
    orderBy: { title: "asc" },
  });

  const coreSecondary = courses.filter((c) => c.subjectId);
  const examPrep = courses.filter((c) => c.examType && !c.subjectId);
  const skills = courses.filter((c) => !c.subjectId && !c.examType);

  const coreBySubject = new Map<string, typeof coreSecondary>();
  for (const c of coreSecondary) {
    const name = c.subject!.name;
    coreBySubject.set(name, [...(coreBySubject.get(name) ?? []), c]);
  }

  const examByType = new Map<string, typeof examPrep>();
  for (const c of examPrep) {
    examByType.set(c.examType!, [...(examByType.get(c.examType!) ?? []), c]);
  }

  const skillsByCategory = new Map<CourseCategory, typeof skills>();
  for (const c of skills) {
    skillsByCategory.set(c.category, [...(skillsByCategory.get(c.category) ?? []), c]);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">
        ← Back home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Courses</h1>
      <p className="mt-2 max-w-2xl text-slate-400">
        Learn from great schools, wherever you are. Your school decides
        where you&apos;re enrolled — not where you can learn.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/educom/schools"
          className="inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Explore schools →
        </Link>
        <Link
          href="/educom/search"
          className="inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Search →
        </Link>
        <Link
          href="/educom/rankings"
          className="inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Discover →
        </Link>
      </div>

      {session?.user.role === "STUDENT" && <LearnHub userId={session.user.id} />}

      <form method="GET" className="mt-8 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search courses…"
          className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
        <select
          name="difficulty"
          defaultValue={difficultyFilter}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
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
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
        >
          <option value="">Free & paid</option>
          <option value="free">Free only</option>
          <option value="paid">Paid only</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          Filter
        </button>
      </form>

      {courses.length === 0 && (
        <p className="mt-8 text-sm text-slate-400">
          No courses match your search. Try clearing the filters.
        </p>
      )}

      {coreSecondary.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Core Secondary School</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...coreBySubject.entries()].map(([subjectName, list]) => (
              <div key={subjectName} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
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
          <h2 className="text-lg font-semibold">Exam Preparation</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...examByType.entries()].map(([examType, list]) => (
              <div key={examType} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
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

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Skills</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skillCategories.map((category) => {
            const categoryCourses = skillsByCategory.get(category.key) ?? [];
            return (
              <div key={category.key} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="font-medium">{category.label}</p>
                {categoryCourses.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {search || difficultyFilter || priceFilter
                      ? "No matches in this category."
                      : "Courses coming soon."}
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {categoryCourses.map((c) => (
                      <CourseCardLink key={c.id} course={c} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
