import { prisma } from "@/lib/prisma";

const EMA_ALPHA = 0.3;
const CONFIDENCE_MAX_ATTEMPTS = 10;
const MIN_TOPICS_FOR_READINESS = 3;

/** Updates one topic's mastery estimate after a scored attempt, using an
 * exponential moving average so recent performance matters more than old
 * performance (adaptive learning), while confidenceScore grows with volume
 * so a single lucky/unlucky guess can't swing "weak topic" recommendations. */
export async function recordTopicAttempt(params: {
  userId: string;
  subjectId: string;
  topic: string;
  isCorrect: boolean;
}) {
  const { userId, subjectId, topic, isCorrect } = params;

  const existing = await prisma.studentTopicMastery.findUnique({
    where: { userId_subjectId_topic: { userId, subjectId, topic } },
  });

  const outcome = isCorrect ? 100 : 0;
  const masteryScore = existing
    ? existing.masteryScore * (1 - EMA_ALPHA) + outcome * EMA_ALPHA
    : outcome;
  const questionsAttempted = (existing?.questionsAttempted ?? 0) + 1;
  const questionsCorrect = (existing?.questionsCorrect ?? 0) + (isCorrect ? 1 : 0);
  const confidenceScore = Math.min(1, questionsAttempted / CONFIDENCE_MAX_ATTEMPTS);

  await prisma.studentTopicMastery.upsert({
    where: { userId_subjectId_topic: { userId, subjectId, topic } },
    update: { masteryScore, confidenceScore, questionsAttempted, questionsCorrect, lastPracticedAt: new Date() },
    create: {
      userId,
      subjectId,
      topic,
      masteryScore,
      confidenceScore,
      questionsAttempted,
      questionsCorrect,
      lastPracticedAt: new Date(),
    },
  });
}

export async function recordTopicAttempts(
  userId: string,
  items: { subjectId: string; topic: string; isCorrect: boolean }[]
) {
  for (const item of items) {
    await recordTopicAttempt({ userId, ...item });
  }
}

/** Recomputes the WEAK_TOPIC/STRONG_TOPIC snapshot from current mastery
 * data. Snapshot-style (delete + recreate) rather than upsert, since
 * AiLearningInsight has no natural unique key once subject/topic are
 * optional (e.g. a readiness summary has neither). */
export async function refreshTopicInsights(userId: string) {
  const [weak, strong] = await Promise.all([
    prisma.studentTopicMastery.findMany({
      where: { userId, confidenceScore: { gt: 0.15 }, masteryScore: { lt: 60 } },
      orderBy: { masteryScore: "asc" },
      take: 5,
    }),
    prisma.studentTopicMastery.findMany({
      where: { userId, confidenceScore: { gt: 0.15 }, masteryScore: { gte: 75 } },
      orderBy: { masteryScore: "desc" },
      take: 5,
    }),
  ]);

  await prisma.$transaction([
    prisma.aiLearningInsight.deleteMany({
      where: { userId, insightType: { in: ["WEAK_TOPIC", "STRONG_TOPIC"] } },
    }),
    prisma.aiLearningInsight.createMany({
      data: [
        ...weak.map((t) => ({
          userId,
          subjectId: t.subjectId,
          topic: t.topic,
          insightType: "WEAK_TOPIC" as const,
          insight: `Struggling with ${t.topic} (${Math.round(t.masteryScore)}% mastery over ${t.questionsAttempted} questions).`,
          confidence: t.confidenceScore,
        })),
        ...strong.map((t) => ({
          userId,
          subjectId: t.subjectId,
          topic: t.topic,
          insightType: "STRONG_TOPIC" as const,
          insight: `Doing well in ${t.topic} (${Math.round(t.masteryScore)}% mastery over ${t.questionsAttempted} questions).`,
          confidence: t.confidenceScore,
        })),
      ],
    }),
  ]);
}

export type StudyRecommendation = {
  topic: string;
  subjectName: string;
  masteryScore: number;
  nextTopic: string | null;
  lesson: { id: string; courseId: string; title: string } | null;
} | null;

/** The single most useful thing to study today: the lowest-mastery topic
 * with enough data to trust, plus what to review after that. Returns null
 * rather than a fabricated recommendation when there isn't enough data yet. */
export async function getTodaysRecommendation(userId: string): Promise<StudyRecommendation> {
  const weakest = await prisma.studentTopicMastery.findMany({
    where: { userId, confidenceScore: { gt: 0.15 } },
    orderBy: { masteryScore: "asc" },
    take: 2,
    include: { subject: { select: { name: true } } },
  });
  if (weakest.length === 0) return null;

  const top = weakest[0];
  const lesson = await prisma.lesson.findFirst({
    where: { topic: top.topic, module: { course: { published: true } } },
    select: { id: true, title: true, module: { select: { courseId: true } } },
  });

  return {
    topic: top.topic,
    subjectName: top.subject.name,
    masteryScore: Math.round(top.masteryScore),
    nextTopic: weakest[1]?.topic ?? null,
    lesson: lesson ? { id: lesson.id, courseId: lesson.module.courseId, title: lesson.title } : null,
  };
}

export type SubjectReadiness = {
  subjectName: string;
  readinessPct: number;
  strongTopics: string[];
  weakTopics: string[];
  recommendedStudyMinutes: number;
};

/** Only returns a subject once there's enough tracked topic data to say
 * anything meaningful — never a guess dressed up as a percentage. */
export async function getExamReadiness(userId: string): Promise<SubjectReadiness[]> {
  const rows = await prisma.studentTopicMastery.findMany({
    where: { userId, confidenceScore: { gt: 0.15 } },
    include: { subject: { select: { name: true } } },
  });

  const bySubject = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = bySubject.get(row.subjectId) ?? [];
    list.push(row);
    bySubject.set(row.subjectId, list);
  }

  const result: SubjectReadiness[] = [];
  for (const topics of bySubject.values()) {
    if (topics.length < MIN_TOPICS_FOR_READINESS) continue;
    const avg = topics.reduce((sum, t) => sum + t.masteryScore, 0) / topics.length;
    const strong = topics.filter((t) => t.masteryScore >= 75).map((t) => t.topic);
    const weak = topics.filter((t) => t.masteryScore < 60).map((t) => t.topic);
    result.push({
      subjectName: topics[0].subject.name,
      readinessPct: Math.round(avg),
      strongTopics: strong,
      weakTopics: weak,
      recommendedStudyMinutes: weak.length * 20,
    });
  }

  return result.sort((a, b) => a.readinessPct - b.readinessPct);
}
