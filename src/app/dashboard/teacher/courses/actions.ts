"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CourseCategory, Difficulty, LessonType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function assertTeacher(userId: string) {
  const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
  if (!teacher) throw new Error("You don't have a teacher profile.");
  return teacher;
}

async function assertOwnsCourse(teacherId: string, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.teacherId !== teacherId) {
    throw new Error("Course not found.");
  }
  return course;
}

export async function createCourse(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const teacher = await assertTeacher(session.user.id);

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  if (!title || !description) {
    throw new Error("Title and description are required.");
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      category: formData.get("category") as CourseCategory,
      instructorName: (formData.get("instructorName") as string)?.trim() || session.user.name,
      difficulty: (formData.get("difficulty") as Difficulty) || undefined,
      estimatedMinutes: formData.get("estimatedMinutes")
        ? Number(formData.get("estimatedMinutes"))
        : undefined,
      teacherId: teacher.id,
      schoolId: teacher.schoolId,
      published: false,
    },
  });

  redirect(`/dashboard/teacher/courses/${course.id}`);
}

export async function togglePublish(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const teacher = await assertTeacher(session.user.id);

  const courseId = formData.get("courseId") as string;
  const course = await assertOwnsCourse(teacher.id, courseId);

  await prisma.course.update({
    where: { id: courseId },
    data: { published: !course.published },
  });

  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function createModule(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const teacher = await assertTeacher(session.user.id);

  const courseId = formData.get("courseId") as string;
  await assertOwnsCourse(teacher.id, courseId);

  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Module title is required.");

  const count = await prisma.module.count({ where: { courseId } });
  await prisma.module.create({ data: { courseId, title, order: count } });

  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function createLesson(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const teacher = await assertTeacher(session.user.id);

  const moduleId = formData.get("moduleId") as string;
  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!mod) throw new Error("Module not found.");
  await assertOwnsCourse(teacher.id, mod.courseId);

  const title = (formData.get("title") as string)?.trim();
  const type = formData.get("type") as LessonType;
  if (!title) throw new Error("Lesson title is required.");

  const count = await prisma.lesson.count({ where: { moduleId } });
  await prisma.lesson.create({
    data: {
      moduleId,
      title,
      type,
      order: count,
      content: (formData.get("content") as string)?.trim() || null,
      videoUrl: (formData.get("videoUrl") as string)?.trim() || null,
      topic: (formData.get("topic") as string)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/teacher/courses/${mod.courseId}`);
}

async function assertOwnsLesson(teacherId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson || lesson.module.course.teacherId !== teacherId) {
    throw new Error("Lesson not found.");
  }
  return lesson;
}

export async function addQuizQuestion(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const teacher = await assertTeacher(session.user.id);

  const lessonId = formData.get("lessonId") as string;
  const lesson = await assertOwnsLesson(teacher.id, lessonId);

  const prompt = (formData.get("prompt") as string)?.trim();
  const optionTexts = ["A", "B", "C", "D"].map((k) => (formData.get(`option${k}`) as string)?.trim());
  const correctOption = formData.get("correctOption") as string;

  if (!prompt || optionTexts.some((t) => !t) || !correctOption) {
    throw new Error("Fill in the question, all four options, and select the correct one.");
  }

  const count = await prisma.quizQuestion.count({ where: { lessonId } });
  await prisma.quizQuestion.create({
    data: {
      lessonId,
      order: count,
      prompt,
      options: optionTexts.map((text, i) => ({ key: ["A", "B", "C", "D"][i], text })),
      correctOption,
    },
  });

  revalidatePath(
    `/dashboard/teacher/courses/${lesson.module.course.id}/lessons/${lessonId}`
  );
}

export async function createAssignment(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const teacher = await assertTeacher(session.user.id);

  const courseId = formData.get("courseId") as string;
  await assertOwnsCourse(teacher.id, courseId);

  const title = (formData.get("title") as string)?.trim();
  const instructions = (formData.get("instructions") as string)?.trim();
  const dueAtRaw = formData.get("dueAt") as string;
  if (!title || !instructions) {
    throw new Error("Title and instructions are required.");
  }

  await prisma.assignment.create({
    data: {
      courseId,
      title,
      instructions,
      dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
    },
  });

  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function gradeSubmission(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const teacher = await assertTeacher(session.user.id);

  const submissionId = formData.get("submissionId") as string;
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { course: true } } },
  });
  if (!submission || submission.assignment.course.teacherId !== teacher.id) {
    throw new Error("Submission not found.");
  }

  const grade = Number(formData.get("grade"));
  const feedback = (formData.get("feedback") as string)?.trim() || null;

  await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: { grade, feedback, gradedAt: new Date() },
  });

  revalidatePath(`/dashboard/teacher/courses/${submission.assignment.courseId}/assignments/${submission.assignmentId}`);
}

export async function scheduleLiveClass(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const teacher = await assertTeacher(session.user.id);

  const courseId = formData.get("courseId") as string;
  await assertOwnsCourse(teacher.id, courseId);

  const title = (formData.get("title") as string)?.trim();
  const scheduledAtRaw = formData.get("scheduledAt") as string;
  const durationMinutes = Number(formData.get("durationMinutes"));
  const meetingUrl = (formData.get("meetingUrl") as string)?.trim();

  if (!title || !scheduledAtRaw || !durationMinutes || !meetingUrl) {
    throw new Error("Fill in a title, date/time, duration, and meeting link.");
  }

  await prisma.liveClass.create({
    data: {
      courseId,
      title,
      scheduledAt: new Date(scheduledAtRaw),
      durationMinutes,
      meetingUrl,
    },
  });

  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}
