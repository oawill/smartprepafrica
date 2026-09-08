import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDrillConfig } from "@/lib/practice/exam-drill-config";

// Same constants/formula as src/lib/ai/mastery-service.ts (subject-only
// mastery) and src/lib/sat/mastery-service.ts (SAT skill mastery) —
// deliberately kept identical across all three so the EMA behaves
// consistently everywhere it's used, even though each writes to its own
// model per the codebase's established "separate model per signal" pattern.
export const EMA_ALPHA = 0.3;
export const CONFIDENCE_MAX_ATTEMPTS = 10;
export const CONFIDENCE_TRUST_THRESHOLD = 0.15;

/** Updates one (exam, subject, topic) mastery estimate after a scored
 * attempt. Exam-scoped counterpart to recordTopicAttempt in
 * src/lib/ai/mastery-service.ts — see StudentExamTopicMastery's schema
 * comment for why this is a separate model rather than adding `exam` to
 * the existing one. */
export async function recordExamTopicAttempt(params: {
  userId: string;
  exam: ExamType;
  subjectId: string;
  topic: string;
  isCorrect: boolean;
}) {
  const { userId, exam, subjectId, topic, isCorrect } = params;

  const existing = await prisma.studentExamTopicMastery.findUnique({
    where: { userId_exam_subjectId_topic: { userId, exam, subjectId, topic } },
  });

  const outcome = isCorrect ? 100 : 0;
  const masteryScore = existing
    ? existing.masteryScore * (1 - EMA_ALPHA) + outcome * EMA_ALPHA
    : outcome;
  const questionsAttempted = (existing?.questionsAttempted ?? 0) + 1;
  const questionsCorrect = (existing?.questionsCorrect ?? 0) + (isCorrect ? 1 : 0);
  const confidenceScore = Math.min(1, questionsAttempted / CONFIDENCE_MAX_ATTEMPTS);

  await prisma.studentExamTopicMastery.upsert({
    where: { userId_exam_subjectId_topic: { userId, exam, subjectId, topic } },
    update: { masteryScore, confidenceScore, questionsAttempted, questionsCorrect, lastPracticedAt: new Date() },
    create: {
      userId,
      exam,
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

export async function recordExamTopicAttempts(
  userId: string,
  exam: ExamType,
  items: { subjectId: string; topic: string; isCorrect: boolean }[]
) {
  for (const item of items) {
    await recordExamTopicAttempt({ userId, exam, ...item });
  }
}

// ---------- Status classification ----------

/** Subject/overall readiness status — the three-tier 🟢/🟠/🔴 the spec
 * shows next to each subject. Thresholds chosen to match the spec's own
 * worked example exactly (English 81%→🟢, Biology 77%→🟢, Mathematics
 * 64%→🟠, Physics 69%→🟠, Chemistry 51%→🔴). */
export type ReadinessStatus = "STRONG" | "NEEDS_IMPROVEMENT" | "PRIORITY_REVIEW" | "NOT_ENOUGH_DATA";

export const READINESS_STATUS_META: Record<ReadinessStatus, { emoji: string; label: string }> = {
  STRONG: { emoji: "🟢", label: "Strong" },
  NEEDS_IMPROVEMENT: { emoji: "🟠", label: "Needs Improvement" },
  PRIORITY_REVIEW: { emoji: "🔴", label: "Priority Review" },
  NOT_ENOUGH_DATA: { emoji: "⚪", label: "Not enough data yet" },
};

export function classifyReadiness(score: number | null, confidence: number): ReadinessStatus {
  if (score === null || confidence <= CONFIDENCE_TRUST_THRESHOLD) return "NOT_ENOUGH_DATA";
  if (score >= 75) return "STRONG";
  if (score >= 60) return "NEEDS_IMPROVEMENT";
  return "PRIORITY_REVIEW";
}

/** Topic-level status — the four-tier Strong/Improving/Review/Weak the
 * spec's Topic-Level Mastery example shows (Algebra 82%→Strong, Geometry
 * 72%→Improving, Quadratic Equations 61%→Review, Word Problems 43%→Weak).
 * Thresholds fitted to match that worked example exactly. */
export type TopicStatus = "STRONG" | "IMPROVING" | "REVIEW" | "WEAK" | "NOT_ENOUGH_DATA";

export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  STRONG: "Strong",
  IMPROVING: "Improving",
  REVIEW: "Review",
  WEAK: "Weak",
  NOT_ENOUGH_DATA: "Not enough data yet",
};

export function classifyMastery(score: number, confidence: number): TopicStatus {
  if (confidence <= CONFIDENCE_TRUST_THRESHOLD) return "NOT_ENOUGH_DATA";
  if (score >= 80) return "STRONG";
  if (score >= 65) return "IMPROVING";
  if (score >= 50) return "REVIEW";
  return "WEAK";
}

/** Three-tier classification of raw in-attempt accuracy (not EMA/confidence
 * gated — used for "Drill Complete" per-topic breakdowns, where the signal
 * is this single attempt's performance, not long-term mastery). Same
 * boundaries as classifyReadiness for consistency across the feature. */
export type AccuracyTier = "STRONG" | "REVIEW" | "WEAK";

export function classifyAccuracy(accuracyPct: number): AccuracyTier {
  if (accuracyPct >= 75) return "STRONG";
  if (accuracyPct >= 60) return "REVIEW";
  return "WEAK";
}

// ---------- Subject scope ----------

/** Which subjects to show for this student's exam readiness/drills — their
 * StudentExamProfile selection, uniformly for all four exams (see
 * exam-profile-service.ts). Returns an empty array when no profile exists
 * yet; callers gate on that via hasExamProfile and redirect to onboarding
 * rather than silently falling back to the full catalog — showing every
 * subject in existence is exactly what this feature exists to avoid. */
export async function getExamSubjectScope(
  userId: string,
  exam: ExamType
): Promise<{ id: string; name: string }[]> {
  const profile = await prisma.studentExamProfile.findUnique({
    where: { userId_exam: { userId, exam } },
    select: { subjects: { select: { id: true, name: true } } },
  });
  return profile?.subjects ?? [];
}

// ---------- Readiness ----------

export type ExamSubjectReadiness = {
  subjectId: string;
  subjectName: string;
  readinessPct: number | null;
  status: ReadinessStatus;
  strongTopics: string[];
  weakTopics: string[];
};

export type ExamReadiness = {
  overall: { readinessPct: number | null; status: ReadinessStatus };
  subjects: ExamSubjectReadiness[];
};

/** Never guesses: a subject only gets a score once it has at least
 * minTopicsForReadiness confidently-tracked topics (admin-configurable per
 * exam, default 3 — same gate src/lib/ai/mastery-service.ts's
 * getExamReadiness already uses for the subject-only version). */
export async function getExamReadiness(userId: string, exam: ExamType): Promise<ExamReadiness> {
  const [config, scopeSubjects] = await Promise.all([
    getDrillConfig(exam),
    getExamSubjectScope(userId, exam),
  ]);
  const scopeIds = new Set(scopeSubjects.map((s) => s.id));

  const rows = await prisma.studentExamTopicMastery.findMany({
    where: { userId, exam, subjectId: { in: [...scopeIds] }, confidenceScore: { gt: CONFIDENCE_TRUST_THRESHOLD } },
  });

  const bySubject = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = bySubject.get(row.subjectId) ?? [];
    list.push(row);
    bySubject.set(row.subjectId, list);
  }

  const subjects: ExamSubjectReadiness[] = scopeSubjects.map((subject) => {
    const topics = bySubject.get(subject.id) ?? [];
    if (topics.length < config.minTopicsForReadiness) {
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        readinessPct: null,
        status: "NOT_ENOUGH_DATA",
        strongTopics: [],
        weakTopics: [],
      };
    }
    const avg = Math.round(topics.reduce((sum, t) => sum + t.masteryScore, 0) / topics.length);
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      readinessPct: avg,
      status: classifyReadiness(avg, 1), // topics already confidence-filtered above
      strongTopics: topics.filter((t) => t.masteryScore >= 75).map((t) => t.topic),
      weakTopics: topics.filter((t) => t.masteryScore < 60).map((t) => t.topic),
    };
  });

  const scored = subjects.filter((s) => s.readinessPct !== null);
  const overallPct = scored.length
    ? Math.round(scored.reduce((sum, s) => sum + (s.readinessPct ?? 0), 0) / scored.length)
    : null;

  return {
    overall: { readinessPct: overallPct, status: classifyReadiness(overallPct, overallPct === null ? 0 : 1) },
    subjects,
  };
}

// ---------- Topic mastery drill-down ----------

export type TopicMasteryRow = {
  topic: string;
  masteryScore: number;
  confidenceScore: number;
  status: TopicStatus;
  questionsAttempted: number;
};

export async function getTopicMastery(
  userId: string,
  exam: ExamType,
  subjectId: string
): Promise<TopicMasteryRow[]> {
  const rows = await prisma.studentExamTopicMastery.findMany({
    where: { userId, exam, subjectId },
    orderBy: { masteryScore: "asc" },
  });
  return rows.map((r) => ({
    topic: r.topic,
    masteryScore: Math.round(r.masteryScore),
    confidenceScore: r.confidenceScore,
    status: classifyMastery(r.masteryScore, r.confidenceScore),
    questionsAttempted: r.questionsAttempted,
  }));
}

// ---------- Biggest opportunity ----------

export type BiggestOpportunity = {
  subjectId: string;
  subjectName: string;
  readinessPct: number;
  topics: string[];
} | null;

/** The weakest subject with an actual score (never a subject still in the
 * "not enough data" state — recommending a subject you can't yet measure
 * would be a guess), plus its 3 weakest topics. Takes already-computed
 * readiness rather than recomputing it — callers typically already have it
 * from getExamReadiness in the same page load (avoids a redundant query,
 * and avoids two concurrent getDrillConfig upserts racing on first read —
 * see exam-drill-config.ts's own defensive fallback for when that still
 * happens elsewhere). */
export async function getBiggestOpportunity(
  userId: string,
  exam: ExamType,
  readiness: ExamReadiness
): Promise<BiggestOpportunity> {
  const scored = readiness.subjects.filter((s) => s.readinessPct !== null);
  if (scored.length === 0) return null;

  const weakest = scored.reduce((min, s) => ((s.readinessPct ?? 0) < (min.readinessPct ?? 0) ? s : min));
  const topics = await getTopicMastery(userId, exam, weakest.subjectId);
  const weakestTopics = topics
    .filter((t) => t.status === "WEAK" || t.status === "REVIEW")
    .slice(0, 3)
    .map((t) => t.topic);

  return {
    subjectId: weakest.subjectId,
    subjectName: weakest.subjectName,
    readinessPct: weakest.readinessPct ?? 0,
    topics: weakestTopics.length > 0 ? weakestTopics : topics.slice(0, 3).map((t) => t.topic),
  };
}

// ---------- Readiness trend ----------

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Upserts today's readiness snapshot — a no-op after the first call each
 * day (unique on [userId, exam, day]), so calling this on every submitted
 * attempt is cheap and never creates duplicate rows. Skips entirely while
 * there's no real score yet, so the trend never starts with a fabricated
 * data point. */
export async function recordReadinessSnapshot(userId: string, exam: ExamType) {
  const readiness = await getExamReadiness(userId, exam);
  if (readiness.overall.readinessPct === null) return;

  const day = startOfDay(new Date());
  await prisma.readinessTrendSnapshot.upsert({
    where: { userId_exam_day: { userId, exam, day } },
    update: { readinessPct: readiness.overall.readinessPct },
    create: { userId, exam, day, readinessPct: readiness.overall.readinessPct },
  });
}

export type ReadinessTrend = {
  current: number | null;
  sevenDayDelta: number | null;
  thirtyDayDelta: number | null;
  overallDelta: number | null;
};

/** Pure calculation over already-fetched snapshots (ascending by day) —
 * separated from the Prisma read below so the delta math is unit-testable
 * without a database, same split SAT's tierContentByExposure uses. */
export function computeTrendDeltas(
  snapshots: { day: Date; readinessPct: number }[],
  now: Date = new Date()
): ReadinessTrend {
  if (snapshots.length === 0) {
    return { current: null, sevenDayDelta: null, thirtyDayDelta: null, overallDelta: null };
  }

  const current = snapshots[snapshots.length - 1].readinessPct;
  const first = snapshots[0].readinessPct;

  const findBaseline = (daysAgo: number): number | null => {
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const candidate = snapshots.find((s) => s.day <= cutoff);
    return candidate ? candidate.readinessPct : null;
  };

  const sevenDayBaseline = findBaseline(7);
  const thirtyDayBaseline = findBaseline(30);

  return {
    current: Math.round(current),
    sevenDayDelta: sevenDayBaseline !== null ? Math.round(current - sevenDayBaseline) : null,
    thirtyDayDelta: thirtyDayBaseline !== null ? Math.round(current - thirtyDayBaseline) : null,
    overallDelta: snapshots.length > 1 ? Math.round(current - first) : null,
  };
}

/** Reads pre-computed snapshots only — never recomputes from raw attempt
 * history, so this stays O(1) regardless of how much practice history the
 * student has (the performance requirement in the spec). */
export async function getReadinessTrend(userId: string, exam: ExamType): Promise<ReadinessTrend> {
  const snapshots = await prisma.readinessTrendSnapshot.findMany({
    where: { userId, exam },
    orderBy: { day: "asc" },
    select: { day: true, readinessPct: true },
  });
  return computeTrendDeltas(snapshots);
}

// ---------- Recommended next drill ----------

export type RecommendedDrill = {
  subjectId: string;
  subjectName: string;
  topic: string;
  size: number;
} | null;

/** The weakest topic among the questions actually in this attempt —
 * mirrors SAT's retryWeakSkills (src/app/international-exams/sat/drill/actions.ts)
 * against QuestionResponse/Question.topic instead of SatAttemptItem. */
export async function getRecommendedDrillAfterAttempt(attemptId: string): Promise<RecommendedDrill> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      exam: true,
      responses: {
        select: {
          isCorrect: true,
          question: { select: { subjectId: true, topic: true, subject: { select: { name: true } } } },
        },
      },
    },
  });
  if (!attempt) return null;

  const buckets = new Map<
    string,
    { subjectId: string; subjectName: string; topic: string; correct: number; total: number }
  >();
  for (const r of attempt.responses) {
    if (!r.question.topic || r.isCorrect === null) continue;
    const key = `${r.question.subjectId}::${r.question.topic}`;
    const bucket = buckets.get(key) ?? {
      subjectId: r.question.subjectId,
      subjectName: r.question.subject.name,
      topic: r.question.topic,
      correct: 0,
      total: 0,
    };
    bucket.total += 1;
    if (r.isCorrect) bucket.correct += 1;
    buckets.set(key, bucket);
  }
  if (buckets.size === 0) return null;

  const weakest = [...buckets.values()].sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
  const config = await getDrillConfig(attempt.exam);

  return {
    subjectId: weakest.subjectId,
    subjectName: weakest.subjectName,
    topic: weakest.topic,
    size: config.topicDrillSize,
  };
}
