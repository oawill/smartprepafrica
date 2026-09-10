"use server";

import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordTopicAttempts, refreshTopicInsights } from "@/lib/ai/mastery-service";
import { recordCrossoverAttempts } from "@/lib/learning/prep-crossover";
import { awardXp } from "@/lib/gamification/xp-service";
import { awardEnrollmentCommission } from "@/lib/teachers/compensation";
import { notifyUser } from "@/lib/notify";
import { getUserPlan } from "@/lib/ai/limits";
import { canEnrollInCourse } from "@/lib/learning/course-access";
import { generateCertificateVerificationCode } from "@/lib/certificates/verification-code";

export async function toggleFollowTeacher(teacherId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const existing = await prisma.teacherFollow.findUnique({
    where: { userId_teacherId: { userId: session.user.id, teacherId } },
  });

  if (existing) {
    await prisma.teacherFollow.delete({ where: { id: existing.id } });
  } else {
    await prisma.teacherFollow.create({
      data: { userId: session.user.id, teacherId },
    });
  }

  revalidatePath(`/learn/teachers/${teacherId}`);
}

/** Shared by enrollInCourse and enrollInProgramme's "enroll in all"
 * loop — subscription gate + idempotent CourseEnrollment upsert +
 * best-effort commission award. Returns silently (no redirect) when
 * the plan doesn't cover this course, since a Programme's "enroll in
 * all" needs to keep enrolling the learner's other member courses
 * rather than bailing out on the first gated one. */
async function enrollUserInCourse(userId: string, courseId: string): Promise<{ enrolled: boolean }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { requiresSubscription: true },
  });
  if (!course) notFound();

  const plan = await getUserPlan(userId);
  if (!canEnrollInCourse(plan, course.requiresSubscription)) {
    return { enrolled: false };
  }

  const existingEnrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId },
  });

  // A commission failure must never block the student's actual
  // enrollment — same defensive wrapping the Partner referral system
  // uses around its own commission-creation hook.
  if (!existingEnrollment && plan !== "FREE") {
    try {
      await awardEnrollmentCommission(courseId, userId);
    } catch (error) {
      console.error("Failed to award teacher enrollment commission:", error);
    }
  }

  return { enrolled: true };
}

export async function enrollInCourse(courseId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const { enrolled } = await enrollUserInCourse(session.user.id, courseId);
  if (!enrolled) {
    redirect("/pricing?reason=course_subscription_required");
  }

  revalidatePath(`/learn/${courseId}`);
}

export async function enrollInProgramme(programmeId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const memberCourses = await prisma.programmeCourse.findMany({
    where: { programmeId, course: { archived: false } },
    select: { courseId: true },
  });

  for (const { courseId } of memberCourses) {
    await enrollUserInCourse(session.user.id, courseId);
  }

  revalidatePath(`/learn/programmes/${programmeId}`);
}

async function checkCourseCompletion(userId: string, enrollmentId: string, courseId: string) {
  const [totalLessons, completedLessons, totalAssignments, submittedAssignments] = await Promise.all([
    prisma.lesson.count({ where: { module: { courseId } } }),
    prisma.lessonProgress.count({
      where: { enrollmentId, completedAt: { not: null } },
    }),
    prisma.assignment.count({ where: { courseId } }),
    prisma.assignmentSubmission.count({ where: { userId, assignment: { courseId } } }),
  ]);

  const lessonsComplete = totalLessons > 0 && completedLessons >= totalLessons;
  const assignmentsComplete = submittedAssignments >= totalAssignments;

  if (lessonsComplete && assignmentsComplete) {
    await prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await prisma.certificate.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId, verificationCode: generateCertificateVerificationCode() },
    });

    await awardXp(userId, "COURSE_COMPLETE", courseId);
    await checkProgrammeCompletions(userId, courseId);
  }
}

/** Called after a course flips to COMPLETED — checks every published
 * Programme that includes this course and issues a ProgrammeCertificate
 * once every one of that Programme's member courses is COMPLETED for
 * this user. No separate "programme enrollment" state exists: this
 * always re-derives completion from each member course's own
 * CourseEnrollment, so it can never drift out of sync with it. */
async function checkProgrammeCompletions(userId: string, courseId: string) {
  const memberships = await prisma.programmeCourse.findMany({
    where: { courseId, programme: { published: true } },
    select: { programmeId: true },
  });

  for (const { programmeId } of memberships) {
    const memberCourseIds = (
      await prisma.programmeCourse.findMany({ where: { programmeId }, select: { courseId: true } })
    ).map((c) => c.courseId);

    const completedCount = await prisma.courseEnrollment.count({
      where: { userId, courseId: { in: memberCourseIds }, status: "COMPLETED" },
    });

    if (completedCount === memberCourseIds.length) {
      await prisma.programmeCertificate.upsert({
        where: { userId_programmeId: { userId, programmeId } },
        update: {},
        create: { userId, programmeId, verificationCode: generateCertificateVerificationCode("PROG") },
      });
    }
  }
}

export async function markLessonComplete(lessonId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });
  const courseId = lesson.module.courseId;

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) {
    throw new Error("You need to enroll in this course first.");
  }

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: { completedAt: new Date() },
    create: { enrollmentId: enrollment.id, lessonId, completedAt: new Date() },
  });

  await awardXp(session.user.id, "LESSON_COMPLETE", lessonId);
  await checkCourseCompletion(session.user.id, enrollment.id, courseId);

  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/learn/${courseId}/lessons/${lessonId}`);
}

export async function submitQuiz(lessonId: string, formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: {
      topic: true,
      module: { select: { courseId: true, course: { select: { subjectId: true } } } },
      quizQuestions: { select: { id: true, correctOption: true } },
    },
  });
  const courseId = lesson.module.courseId;

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) {
    throw new Error("You need to enroll in this course first.");
  }

  const results = lesson.quizQuestions.map((q) => ({
    isCorrect: formData.get(`question_${q.id}`) === q.correctOption,
  }));
  const total = results.length;
  const correct = results.filter((r) => r.isCorrect).length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: { completedAt: new Date(), score },
    create: { enrollmentId: enrollment.id, lessonId, completedAt: new Date(), score },
  });

  await awardXp(session.user.id, "LESSON_COMPLETE", lessonId);

  const subjectId = lesson.module.course.subjectId;
  if (subjectId && lesson.topic && total > 0) {
    await recordTopicAttempts(
      session.user.id,
      results.map((r) => ({ subjectId, topic: lesson.topic!, isCorrect: r.isCorrect }))
    );
    await refreshTopicInsights(session.user.id);
    await recordCrossoverAttempts({
      userId: session.user.id,
      subjectId,
      topic: lesson.topic,
      results: results.map((r) => ({ isCorrect: r.isCorrect })),
    });
  }

  await checkCourseCompletion(session.user.id, enrollment.id, courseId);

  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/learn/${courseId}/lessons/${lessonId}`);
}

export async function submitAssignment(assignmentId: string, formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const assignment = await prisma.assignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: {
      title: true,
      courseId: true,
      course: { select: { title: true, teacher: { select: { userId: true } } } },
    },
  });

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: assignment.courseId } },
  });
  if (!enrollment) {
    throw new Error("You need to enroll in this course first.");
  }

  const content = (formData.get("content") as string)?.trim();
  if (!content) {
    throw new Error("Write a response before submitting.");
  }

  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_userId: { assignmentId, userId: session.user.id } },
    update: { content, submittedAt: new Date(), grade: null, feedback: null, gradedAt: null },
    create: { assignmentId, userId: session.user.id, content },
  });

  if (assignment.course.teacher) {
    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    await notifyUser(
      assignment.course.teacher.userId,
      "ASSIGNMENT_SUBMITTED",
      `${student?.name} submitted "${assignment.title}" (${assignment.course.title}).`,
      `/dashboard/teacher/courses/${assignment.courseId}/assignments/${assignmentId}`
    );
  }

  await checkCourseCompletion(session.user.id, enrollment.id, assignment.courseId);

  revalidatePath(`/learn/${assignment.courseId}`);
}

export async function submitCourseReview(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) {
    throw new Error("You need to be enrolled in this course to review it.");
  }

  const rating = Number(formData.get("rating"));
  if (!rating || rating < 1 || rating > 5) {
    throw new Error("Choose a rating between 1 and 5.");
  }
  const comment = (formData.get("comment") as string)?.trim() || null;

  await prisma.courseReview.upsert({
    where: { courseId_userId: { courseId, userId: session.user.id } },
    update: { rating, comment },
    create: { courseId, userId: session.user.id, rating, comment },
  });

  revalidatePath(`/learn/${courseId}`);
}
