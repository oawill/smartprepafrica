import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrollInProgramme } from "@/app/learn/actions";
import { CheckIcon } from "@/components/ui/icons";

export default async function ProgrammeDetailPage({
  params,
}: {
  params: Promise<{ programmeId: string }>;
}) {
  const { programmeId } = await params;
  const session = await auth();

  const programme = await prisma.programme.findUnique({
    where: { id: programmeId, published: true },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: { course: { select: { id: true, title: true, archived: true } } },
      },
    },
  });
  if (!programme) notFound();

  const memberCourseIds = programme.courses.map((c) => c.courseId);

  const enrollments = session
    ? await prisma.courseEnrollment.findMany({
        where: { userId: session.user.id, courseId: { in: memberCourseIds } },
        select: { courseId: true, status: true },
      })
    : [];
  const enrollmentByCourseId = new Map(enrollments.map((e) => [e.courseId, e.status]));

  const certificate = session
    ? await prisma.programmeCertificate.findUnique({
        where: { userId_programmeId: { userId: session.user.id, programmeId } },
      })
    : null;

  const completedCount = programme.courses.filter(
    (pc) => enrollmentByCourseId.get(pc.courseId) === "COMPLETED"
  ).length;
  const hasUnenrolledMember = programme.courses.some(
    (pc) => !pc.course.archived && !enrollmentByCourseId.has(pc.courseId)
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/learn/programmes" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Programmes
      </Link>

      <h1 className="mt-4 text-h1 font-semibold text-text-primary">{programme.title}</h1>
      {programme.description && <p className="mt-2 text-text-secondary">{programme.description}</p>}

      {session && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              {completedCount} / {programme.courses.length} courses complete
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full bg-success"
              style={{
                width: `${programme.courses.length > 0 ? Math.round((completedCount / programme.courses.length) * 100) : 0}%`,
              }}
            />
          </div>

          {certificate ? (
            <p className="mt-3 rounded-lg border border-success/40 bg-success-surface px-4 py-2 text-sm text-success">
              Programme complete — your certificate has been issued.{" "}
              <Link href={`/certificates/programme/${certificate.id}`} className="font-medium hover:underline">
                View certificate →
              </Link>
            </p>
          ) : (
            hasUnenrolledMember && (
              <form action={enrollInProgramme.bind(null, programme.id)} className="mt-4">
                <button
                  type="submit"
                  className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  Enroll in all courses
                </button>
              </form>
            )
          )}
        </div>
      )}

      <div className="mt-10 space-y-2">
        {programme.courses.map((pc, i) => {
          const status = enrollmentByCourseId.get(pc.courseId);
          return (
            <Link
              key={pc.courseId}
              href={`/learn/${pc.course.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm hover:border-border-strong"
            >
              <span className="text-text-primary">
                {i + 1}. {pc.course.title}
                {pc.course.archived && <span className="ml-2 text-xs text-text-muted">(no longer offered)</span>}
              </span>
              {status === "COMPLETED" ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                  <CheckIcon className="h-3.5 w-3.5" /> Completed
                </span>
              ) : status ? (
                <span className="shrink-0 text-xs text-text-muted">In progress</span>
              ) : (
                <span className="shrink-0 text-xs text-text-muted">Not enrolled</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
