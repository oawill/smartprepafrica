import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherRating, formatRating } from "@/lib/ratings";
import { toggleFollowTeacher } from "@/app/learn/actions";

export default async function TeacherProfilePage({
  params,
}: PageProps<"/learn/teachers/[teacherId]">) {
  const { teacherId } = await params;
  const session = await auth();

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      user: { select: { name: true } },
      school: { select: { id: true, name: true, state: true } },
      courses: {
        where: { published: true },
        include: {
          subject: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { title: "asc" },
      },
    },
  });
  if (!teacher) notFound();

  const [rating, isFollowing, followerCount] = await Promise.all([
    getTeacherRating(teacher.id),
    session
      ? prisma.teacherFollow.findUnique({
          where: { userId_teacherId: { userId: session.user.id, teacherId: teacher.id } },
        })
      : null,
    prisma.teacherFollow.count({ where: { teacherId: teacher.id } }),
  ]);

  const subjectNames = [...new Set(teacher.courses.map((c) => c.subject?.name).filter(Boolean))];
  const totalStudents = teacher.courses.reduce((sum, c) => sum + c._count.enrollments, 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/learn" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Courses
      </Link>

      <div className="mt-4">
        <h1 className="text-3xl font-semibold">{teacher.user.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {subjectNames.length > 0 ? `${subjectNames.join(", ")} Teacher` : "Teacher"}
          {teacher.school && (
            <>
              {" · "}
              <Link href={`/learn/schools/${teacher.school.id}`} className="text-brand-text hover:underline">
                {teacher.school.name}
              </Link>
              {teacher.school.state && ` — ${teacher.school.state}`}
            </>
          )}
        </p>
      </div>

      {teacher.bio && <p className="mt-4 text-text-secondary">{teacher.bio}</p>}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
        {teacher.qualifications && <span>{teacher.qualifications}</span>}
        {teacher.yearsExperience !== null && (
          <span>{teacher.yearsExperience} years experience</span>
        )}
        <span>{formatRating(rating)}</span>
        <span>{totalStudents} student{totalStudents === 1 ? "" : "s"} taught</span>
        <span>{followerCount} follower{followerCount === 1 ? "" : "s"}</span>
      </div>

      {session?.user.role === "STUDENT" && (
        <form action={toggleFollowTeacher.bind(null, teacher.id)} className="mt-4">
          <button
            type="submit"
            className={
              isFollowing
                ? "rounded-full border border-border-strong px-5 py-2 text-sm text-text-secondary hover:border-text-muted"
                : "rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            }
          >
            {isFollowing ? "Following ✓" : "Follow"}
          </button>
        </form>
      )}

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Courses</h2>
        {teacher.courses.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No published courses yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {teacher.courses.map((course) => (
              <Link
                key={course.id}
                href={`/learn/${course.id}`}
                className="rounded-lg border border-border bg-surface-raised p-4 hover:border-border-strong"
              >
                <p className="font-medium text-text-primary">{course.title}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {course._count.enrollments} learner{course._count.enrollments === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
