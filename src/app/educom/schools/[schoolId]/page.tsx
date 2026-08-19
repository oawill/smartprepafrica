import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSchoolRating, formatRating } from "@/lib/ratings";
import { formatNaira } from "@/lib/plans";

export default async function SchoolProfilePage({
  params,
}: PageProps<"/educom/schools/[schoolId]">) {
  const { schoolId } = await params;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      teachers: {
        include: {
          user: { select: { name: true } },
          courses: { where: { published: true }, select: { id: true } },
        },
      },
      courses: {
        where: { published: true },
        include: {
          subject: { select: { name: true } },
          teacher: { select: { user: { select: { name: true } } } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { title: "asc" },
      },
    },
  });
  if (!school) notFound();

  const [rating, upcomingLiveClasses] = await Promise.all([
    getSchoolRating(school.id),
    prisma.liveClass.findMany({
      where: { course: { schoolId: school.id }, scheduledAt: { gte: new Date() } },
      include: { course: { select: { title: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  const subjectNames = [...new Set(school.courses.map((c) => c.subject?.name).filter(Boolean))];
  const totalLearners = school.courses.reduce((sum, c) => sum + c._count.enrollments, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/educom/schools" className="text-sm text-slate-400 hover:text-white">
        ← All schools
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold">{school.name}</h1>
            {school.verified && (
              <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300">
                Verified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {school.state ?? "Nigeria"}, {school.country}
          </p>
        </div>
      </div>

      {school.description && <p className="mt-4 text-slate-300">{school.description}</p>}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
        <span>{formatRating(rating)}</span>
        <span>{totalLearners} learner{totalLearners === 1 ? "" : "s"} on Educom</span>
        <span>{school.teachers.length} teacher{school.teachers.length === 1 ? "" : "s"}</span>
      </div>

      {subjectNames.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {subjectNames.map((name) => (
            <span
              key={name}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Courses</h2>
        {school.courses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No published courses yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {school.courses.map((course) => (
              <Link
                key={course.id}
                href={`/educom/${course.id}`}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-600"
              >
                <p className="font-medium text-slate-100">{course.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {course.teacher?.user.name ?? "SmartPrepAfrica"}
                  {course.subject && ` · ${course.subject.name}`}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {course.priceKobo ? formatNaira(course.priceKobo) : "Free"} ·{" "}
                  {course._count.enrollments} learner{course._count.enrollments === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Teachers</h2>
        {school.teachers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No teachers listed yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {school.teachers.map((t) => (
              <Link
                key={t.id}
                href={`/educom/teachers/${t.id}`}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-600"
              >
                <p className="font-medium text-slate-100">{t.user.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {t.courses.length} course{t.courses.length === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Upcoming live classes</h2>
        {upcomingLiveClasses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No live classes scheduled right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcomingLiveClasses.map((lc) => (
              <li
                key={lc.id}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm"
              >
                <p className="text-slate-100">{lc.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {lc.course.title} · {lc.scheduledAt.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
