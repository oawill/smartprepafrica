import type { AiCoachMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_LESSON_CONTENT_CHARS = 2500;

export type CoachContext = {
  student: {
    name: string;
    gradeLevel: string | null;
    targetExams: string[];
    homeSchool: string | null;
  };
  course?: {
    title: string;
    providerSchool: string | null;
    teacherName: string | null;
    subject: string | null;
    examType: string | null;
    category: string;
  };
  lesson?: {
    title: string;
    topic: string | null;
    content: string | null;
    moduleTitle: string;
    lessonIndex: number;
    totalLessons: number;
  };
  focusQuestion?: {
    prompt: string;
    studentAnswer: string | null;
    correctAnswer: string;
    explanation: string | null;
    topic: string | null;
  };
  recentAttempts: { exam: string; mode: string; score: number | null; daysAgo: number }[];
  weakTopics: { topic: string; subject: string | null; masteryScore: number }[];
  strongTopics: { topic: string; subject: string | null; masteryScore: number }[];
  mode: AiCoachMode;
};

export type BuildContextInput = {
  userId: string;
  courseId?: string | null;
  lessonId?: string | null;
  mode: AiCoachMode;
  focusQuestion?: CoachContext["focusQuestion"];
};

/** Assembles only what's needed to answer the current request — never the
 * student's full database record. Distinguishes the student's home school
 * from the school that authored the course they're currently in, since in
 * SmartPrepAfrica Learning those are frequently different schools. */
export async function buildCoachContext({
  userId,
  courseId,
  lessonId,
  mode,
  focusQuestion,
}: BuildContextInput): Promise<CoachContext> {
  const [user, studentProfile, recentAttemptRows, weakRows, strongRows] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        gradeLevel: true,
        targetExams: true,
        school: { select: { name: true } },
      },
    }),
    prisma.examAttempt.findMany({
      where: { userId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: { exam: true, mode: true, score: true, submittedAt: true },
    }),
    prisma.studentTopicMastery.findMany({
      where: { userId, confidenceScore: { gt: 0.15 } },
      orderBy: { masteryScore: "asc" },
      take: 5,
      select: { topic: true, masteryScore: true, subject: { select: { name: true } } },
    }),
    prisma.studentTopicMastery.findMany({
      where: { userId, confidenceScore: { gt: 0.15 } },
      orderBy: { masteryScore: "desc" },
      take: 5,
      select: { topic: true, masteryScore: true, subject: { select: { name: true } } },
    }),
  ]);

  const now = Date.now();
  const recentAttempts = recentAttemptRows.map((a) => ({
    exam: a.exam,
    mode: a.mode,
    score: a.score,
    daysAgo: a.submittedAt ? Math.floor((now - a.submittedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0,
  }));

  let course: CoachContext["course"];
  let lesson: CoachContext["lesson"];

  if (lessonId) {
    const lessonRow = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        title: true,
        topic: true,
        content: true,
        order: true,
        module: {
          select: {
            title: true,
            lessons: { select: { id: true } },
            course: {
              select: {
                id: true,
                title: true,
                category: true,
                examType: true,
                subject: { select: { name: true } },
                school: { select: { name: true } },
                teacher: { select: { user: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });
    if (lessonRow) {
      lesson = {
        title: lessonRow.title,
        topic: lessonRow.topic,
        content: lessonRow.content ? lessonRow.content.slice(0, MAX_LESSON_CONTENT_CHARS) : null,
        moduleTitle: lessonRow.module.title,
        lessonIndex: lessonRow.order,
        totalLessons: lessonRow.module.lessons.length,
      };
      const c = lessonRow.module.course;
      course = {
        title: c.title,
        providerSchool: c.school?.name ?? null,
        teacherName: c.teacher?.user.name ?? null,
        subject: c.subject?.name ?? null,
        examType: c.examType,
        category: c.category,
      };
    }
  } else if (courseId) {
    const c = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        category: true,
        examType: true,
        subject: { select: { name: true } },
        school: { select: { name: true } },
        teacher: { select: { user: { select: { name: true } } } },
      },
    });
    if (c) {
      course = {
        title: c.title,
        providerSchool: c.school?.name ?? null,
        teacherName: c.teacher?.user.name ?? null,
        subject: c.subject?.name ?? null,
        examType: c.examType,
        category: c.category,
      };
    }
  }

  return {
    student: {
      name: user.name,
      gradeLevel: studentProfile?.gradeLevel ?? null,
      targetExams: studentProfile?.targetExams ?? [],
      homeSchool: studentProfile?.school?.name ?? null,
    },
    course,
    lesson,
    focusQuestion,
    recentAttempts,
    weakTopics: weakRows.map((r) => ({
      topic: r.topic,
      subject: r.subject?.name ?? null,
      masteryScore: r.masteryScore,
    })),
    strongTopics: strongRows.map((r) => ({
      topic: r.topic,
      subject: r.subject?.name ?? null,
      masteryScore: r.masteryScore,
    })),
    mode,
  };
}
