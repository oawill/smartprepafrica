import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ClassLevelPage({
  params,
}: {
  params: Promise<{ classLevelId: string }>;
}) {
  const { classLevelId } = await params;

  const classLevel = await prisma.classLevel.findUnique({
    where: { id: classLevelId },
    include: { curriculum: { select: { name: true } } },
  });
  if (!classLevel) notFound();

  const subjectCounts = await prisma.course.groupBy({
    by: ["subjectId"],
    where: { published: true, classLevelId, subjectId: { not: null } },
    _count: { _all: true },
  });

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectCounts.map((s) => s.subjectId!) } },
    orderBy: { name: "asc" },
  });
  const countBySubjectId = new Map(subjectCounts.map((s) => [s.subjectId, s._count._all]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/educom" className="text-sm text-slate-400 hover:text-white">
        ← Back to SmartPrepAfrica Learning
      </Link>

      <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">{classLevel.curriculum.name}</p>
      <h1 className="mt-1 text-3xl font-semibold">{classLevel.name}</h1>
      <p className="mt-2 text-slate-400">Choose a subject to see available courses and lessons.</p>

      {subjects.length === 0 ? (
        <p className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
          No courses have been published for {classLevel.name} yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/educom?classLevelId=${classLevel.id}&subjectId=${s.id}`}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-600"
            >
              <p className="font-medium text-slate-100">{s.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {countBySubjectId.get(s.id) ?? 0} course{(countBySubjectId.get(s.id) ?? 0) === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
