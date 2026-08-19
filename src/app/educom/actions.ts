"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordTopicAttempts, refreshTopicInsights } from "@/lib/ai/mastery-service";

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

  revalidatePath(`/educom/teachers/${teacherId}`);
}

export async function enrollInCourse(courseId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    update: {},
    create: { userId: session.user.id, courseId },
  });

  revalidatePath(`/educom/${courseId}`);
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
      create: { userId, courseId },
    });
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

  await checkCourseCompletion(session.user.id, enrollment.id, courseId);

  revalidatePath(`/educom/${courseId}`);
  revalidatePath(`/educom/${courseId}/lessons/${lessonId}`);
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

  const subjectId = lesson.module.course.subjectId;
  if (subjectId && lesson.topic && total > 0) {
    await recordTopicAttempts(
      session.user.id,
      results.map((r) => ({ subjectId, topic: lesson.topic!, isCorrect: r.isCorrect }))
    );
    await refreshTopicInsights(session.user.id);
  }

  await checkCourseCompletion(session.user.id, enrollment.id, courseId);

  revalidatePath(`/educom/${courseId}`);
  revalidatePath(`/educom/${courseId}/lessons/${lessonId}`);
}

export async function submitAssignment(assignmentId: string, formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const assignment = await prisma.assignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { courseId: true },
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

  await checkCourseCompletion(session.user.id, enrollment.id, assignment.courseId);

  revalidatePath(`/educom/${assignment.courseId}`);
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

  revalidatePath(`/educom/${courseId}`);
}
