import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/admin/permissions";

/** Who's allowed to read/post/reply on a course's discussions: any
 * enrolled student, the course's own teacher, or an admin holding
 * discussions.manage (the fallback-queue reviewers). Returns the caller's
 * standing so callers can decide isTutorReply / audit-log without a
 * second round of lookups. Kept separate from the "use server" action
 * file so it's directly unit-testable without going through auth(). */
export async function resolveParticipant(userId: string, courseId: string) {
  const [enrollment, course, user] = await Promise.all([
    prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true, teacher: { select: { userId: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, adminRole: true } }),
  ]);
  if (!course) throw new Error("Course not found.");

  const isTeacher = !!course.teacher && course.teacher.userId === userId;
  const isAdmin = user?.role === "ADMIN" && hasPermission(user.adminRole, "discussions.manage");

  if (!enrollment && !isTeacher && !isAdmin) {
    throw new Error("You need to be enrolled in this course to do that.");
  }

  return { course, isTeacher, isAdmin };
}
