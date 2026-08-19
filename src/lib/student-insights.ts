import { prisma } from "@/lib/prisma";

const STALE_STUDY_DAYS = 5;
const LOW_SCORE_THRESHOLD = 40;
const RECENT_WINDOW_DAYS = 7;

export type Alert = {
  type: "inactive" | "low_score" | "course_completed" | "milestone";
  severity: "warning" | "info" | "success";
  message: string;
};

export async function getStudentInsights(userId: string) {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [attempts, enrollments, wrongResponses, lessonCompletionsThisWeek] =
    await Promise.all([
      prisma.examAttempt.findMany({
        where: { userId, submittedAt: { not: null } },
        select: { exam: true, mode: true, score: true, submittedAt: true, totalItems: true },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.courseEnrollment.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              modules: { select: { lessons: { select: { id: true } } } },
            },
          },
          lessonProgress: {
            where: { completedAt: { not: null } },
            select: { lessonId: true, completedAt: true },
          },
        },
      }),
      prisma.questionResponse.findMany({
        where: { isCorrect: false, attempt: { userId } },
        select: { question: { select: { topic: true, subject: { select: { name: true } } } } },
        take: 300,
      }),
      prisma.lessonProgress.count({
        where: {
          enrollment: { userId },
          completedAt: { gte: startOfWeek },
        },
      }),
    ]);

  const avgScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / attempts.length
        )
      : null;

  const topicCounts = new Map<string, { missed: number; subject: string | null }>();
  for (const r of wrongResponses) {
    const topic = r.question.topic;
    if (!topic) continue;
    const entry = topicCounts.get(topic) ?? { missed: 0, subject: r.question.subject?.name ?? null };
    entry.missed += 1;
    topicCounts.set(topic, entry);
  }
  const weakTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1].missed - a[1].missed)
    .slice(0, 5)
    .map(([topic, { missed, subject }]) => ({ topic, missed, subject }));

  const weakSubjects = [...new Set(weakTopics.map((t) => t.subject).filter((s): s is string => !!s))];

  const courseProgress = enrollments.map((e) => {
    const totalLessons = e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedLessons = e.lessonProgress.length;
    return {
      courseId: e.course.id,
      title: e.course.title,
      status: e.status,
      completedLessons,
      totalLessons,
      completedAt: e.completedAt,
      pct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    };
  });

  const lastAttemptAt = attempts[0]?.submittedAt ?? null;
  const lastLessonAt = enrollments
    .flatMap((e) => e.lessonProgress.map((p) => p.completedAt))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const lastActivityAt =
    [lastAttemptAt, lastLessonAt].filter((d): d is Date => d !== null).sort(
      (a, b) => b.getTime() - a.getTime()
    )[0] ?? null;

  const alerts: Alert[] = [];

  const daysSinceActivity = lastActivityAt
    ? Math.floor((Date.now() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  if (daysSinceActivity === null) {
    alerts.push({
      type: "inactive",
      severity: "warning",
      message: "Hasn't started studying yet.",
    });
  } else if (daysSinceActivity >= STALE_STUDY_DAYS) {
    alerts.push({
      type: "inactive",
      severity: "warning",
      message: `Hasn't studied in ${daysSinceActivity} days.`,
    });
  }

  const lowScoreAttempt = attempts.find(
    (a) => a.score !== null && a.score < LOW_SCORE_THRESHOLD
  );
  if (lowScoreAttempt) {
    alerts.push({
      type: "low_score",
      severity: "warning",
      message: `Scored ${Math.round(lowScoreAttempt.score!)}% on a recent ${lowScoreAttempt.exam} ${lowScoreAttempt.mode.toLowerCase().replace("_", " ")}.`,
    });
  }

  const recentlyCompletedCourse = courseProgress.find(
    (c) =>
      c.status === "COMPLETED" &&
      c.completedAt &&
      Date.now() - c.completedAt.getTime() < RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  if (recentlyCompletedCourse) {
    alerts.push({
      type: "course_completed",
      severity: "success",
      message: `Completed "${recentlyCompletedCourse.title}".`,
    });
  }

  const highScoreAttempt = attempts.find((a) => a.score !== null && a.score >= 80);
  if (highScoreAttempt) {
    alerts.push({
      type: "milestone",
      severity: "success",
      message: `Scored ${Math.round(highScoreAttempt.score!)}% on a ${highScoreAttempt.exam} ${highScoreAttempt.mode.toLowerCase().replace("_", " ")} — excellent work.`,
    });
  }

  return {
    examSummary: {
      totalAttempts: attempts.length,
      avgScore,
      lastAttemptAt,
      recent: attempts.slice(0, 5),
    },
    courseProgress,
    weakTopics,
    weakSubjects,
    studyActivity: {
      lessonsCompletedThisWeek: lessonCompletionsThisWeek,
      attemptsThisWeek: attempts.filter(
        (a) => a.submittedAt && a.submittedAt >= startOfWeek
      ).length,
      questionsAnsweredThisWeek: attempts
        .filter((a) => a.submittedAt && a.submittedAt >= startOfWeek)
        .reduce((sum, a) => sum + a.totalItems, 0),
    },
    alerts,
    lastActivityAt,
  };
}

export type StudentInsights = Awaited<ReturnType<typeof getStudentInsights>>;
