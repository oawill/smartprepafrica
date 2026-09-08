import type { ExamType, Difficulty } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSelectionUnits } from "@/lib/practice/attempt-selection";

const STALE_DAYS = 7;

type QuestionCandidate = {
  id: string;
  subjectId: string;
  topic: string | null;
  difficulty: Difficulty;
  passageGroupId: string | null;
  passageOrder: number | null;
};

export type Exposure = { everIncorrect: boolean; mostRecentStartedAt: Date };

/** A student's exposure to a set of questions, derived from their existing
 * QuestionResponse history — same shape/purpose as SAT's getExposureMap in
 * src/lib/sat/drill-service.ts, reimplemented against the Nigerian-exam
 * QuestionResponse/ExamAttempt tables (kept as a separate implementation,
 * matching the codebase's existing precedent of not sharing code across
 * unrelated table shapes — e.g. StudentTopicMastery vs SatSkillMastery). */
async function getExposureMap(userId: string, questionIds: string[]): Promise<Map<string, Exposure>> {
  if (questionIds.length === 0) return new Map();

  const responses = await prisma.questionResponse.findMany({
    where: { questionId: { in: questionIds }, attempt: { userId } },
    select: { questionId: true, isCorrect: true, attempt: { select: { startedAt: true } } },
  });

  const map = new Map<string, Exposure>();
  for (const r of responses) {
    const existing = map.get(r.questionId);
    const wasIncorrect = r.isCorrect === false;
    if (!existing) {
      map.set(r.questionId, { everIncorrect: wasIncorrect, mostRecentStartedAt: r.attempt.startedAt });
    } else {
      existing.everIncorrect = existing.everIncorrect || wasIncorrect;
      if (r.attempt.startedAt > existing.mostRecentStartedAt) {
        existing.mostRecentStartedAt = r.attempt.startedAt;
      }
    }
  }
  return map;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type ExposureTiers<T> = { unseen: T[]; previouslyIncorrect: T[]; staleCorrect: T[]; recentCorrect: T[] };

/** Same tiering shape as SAT's tierContentByExposure (src/lib/sat/drill-service.ts):
 * unseen first, then previously-incorrect (reinforcement), then
 * correct-but-stale, then correct-and-recent (least useful to repeat). */
export function tierByExposure<T extends { id: string }>(
  pool: T[],
  exposure: Map<string, Exposure>,
  now: Date
): ExposureTiers<T> {
  const staleCutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const tiers: ExposureTiers<T> = { unseen: [], previouslyIncorrect: [], staleCorrect: [], recentCorrect: [] };
  for (const item of pool) {
    const exp = exposure.get(item.id);
    if (!exp) tiers.unseen.push(item);
    else if (exp.everIncorrect) tiers.previouslyIncorrect.push(item);
    else if (exp.mostRecentStartedAt < staleCutoff) tiers.staleCorrect.push(item);
    else tiers.recentCorrect.push(item);
  }
  return tiers;
}

const DIFFICULTY_RANK: Record<Difficulty, number> = { HARD: 0, MEDIUM: 1, EASY: 2 };

/** Interleaves a priority-ordered list across topics (round-robin), keeping
 * each topic's own internal priority order intact — gives topic-diverse
 * "balanced coverage" (Quick Check, Practice Session, Challenge) instead of
 * one topic dominating just because it happens to have the most unseen
 * questions. */
export function interleaveByTopic<T extends { topic: string | null }>(items: T[]): T[] {
  const byTopic = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = item.topic ?? "__untagged__";
    if (!byTopic.has(key)) {
      byTopic.set(key, []);
      order.push(key);
    }
    byTopic.get(key)!.push(item);
  }
  const result: T[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const key of order) {
      const list = byTopic.get(key)!;
      if (list.length > 0) {
        result.push(list.shift()!);
        remaining = true;
      }
    }
  }
  return result;
}

/** Packs (already-ordered) selection units into `size` slots WITHOUT
 * reshuffling — unlike selectContiguousUnits in attempt-selection.ts
 * (which shuffles first, since the free-form /practice/[exam] flow has no
 * priority order to preserve), this keeps the smart-selection priority
 * order intact while still keeping passage groups contiguous and skipping
 * (not stopping at) a unit that no longer fits. */
export function packUnitsInOrder(units: { questionIds: string[] }[], size: number): string[] {
  const selected: string[] = [];
  let remaining = size;
  for (const unit of units) {
    if (unit.questionIds.length === 0) continue;
    if (unit.questionIds.length > remaining) continue;
    selected.push(...unit.questionIds);
    remaining -= unit.questionIds.length;
    if (remaining <= 0) break;
  }
  return selected;
}

export type DrillPurpose = "QUICK_CHECK" | "TOPIC_DRILL" | "PRACTICE_SESSION" | "CHALLENGE";

export type SmartSelectionParams = {
  userId: string;
  exam: ExamType;
  subjectIds: string[];
  purpose: DrillPurpose;
  topic?: string;
  /** Multiple topics — used by "Practice My Weak Areas" to pull from every
   * weak/review topic in a subject at once. Ignored when `topic` (singular)
   * is set. */
  topics?: string[];
  size: number;
};

/** Selects up to `size` question ids for a Quick Drill, avoiding repeats
 * and tailoring order to the drill's purpose:
 * - TOPIC_DRILL: filtered to the exact topic (or, when `topics` plural is
 *   given instead — "Practice My Weak Areas" — filtered to that set and
 *   interleaved across them), exposure-tiered.
 * - QUICK_CHECK: exposure-tiered across all eligible subjects/topics, then
 *   interleaved by topic for a balanced mini-assessment.
 * - PRACTICE_SESSION: same as Quick Check but larger, for broader coverage.
 * - CHALLENGE: exposure-tiered with a difficulty skew toward HARD/MEDIUM
 *   within each tier, then interleaved by topic for coverage — degrades
 *   gracefully to whatever difficulty exists when a topic has none tagged
 *   HARD, never a hard failure.
 * Returns fewer than `size` gracefully when the eligible pool is small. */
export async function selectSmartQuestions(params: SmartSelectionParams): Promise<string[]> {
  const { userId, exam, subjectIds, purpose, topic, topics, size } = params;
  if (subjectIds.length === 0 || size <= 0) return [];

  const pool = await prisma.question.findMany({
    where: {
      exam,
      subjectId: { in: subjectIds },
      status: "PUBLISHED",
      ...(topic ? { topic } : topics && topics.length > 0 ? { topic: { in: topics } } : {}),
    },
    select: { id: true, subjectId: true, topic: true, difficulty: true, passageGroupId: true, passageOrder: true },
  });
  if (pool.length === 0) return [];

  const exposure = await getExposureMap(userId, pool.map((q) => q.id));
  const tiers = tierByExposure<QuestionCandidate>(pool, exposure, new Date());

  let ordered: QuestionCandidate[];
  if (purpose === "CHALLENGE") {
    const byDifficulty = (a: QuestionCandidate, b: QuestionCandidate) =>
      DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty];
    const difficultyPrioritized = [
      ...shuffle(tiers.unseen).sort(byDifficulty),
      ...shuffle(tiers.previouslyIncorrect).sort(byDifficulty),
      ...shuffle(tiers.staleCorrect).sort(byDifficulty),
      ...shuffle(tiers.recentCorrect).sort(byDifficulty),
    ];
    ordered = interleaveByTopic(difficultyPrioritized);
  } else {
    const priorityOrdered = [
      ...shuffle(tiers.unseen),
      ...shuffle(tiers.previouslyIncorrect),
      ...shuffle(tiers.staleCorrect),
      ...shuffle(tiers.recentCorrect),
    ];
    // A single-topic TOPIC_DRILL has nothing to interleave; a multi-topic
    // one (topics plural — "Practice My Weak Areas") benefits from the same
    // spread-across-topics interleaving as Quick Check/Practice Session.
    ordered = purpose === "TOPIC_DRILL" && !topics ? priorityOrdered : interleaveByTopic(priorityOrdered);
  }

  const units = buildSelectionUnits(
    ordered.map((q) => ({ id: q.id, passageGroupId: q.passageGroupId, passageOrder: q.passageOrder }))
  );
  return packUnitsInOrder(units, size);
}

/** Per-subject question-count allocation for Smart Mixed Drill — weaker
 * subjects (lower readinessPct) get proportionally more questions, but
 * every subject gets at least 1 (never "completely neglect stronger
 * subjects", per the spec). A subject with no readiness score yet
 * (`null` — not enough data) is treated as a neutral 50%, not 0%, so a
 * single untested subject doesn't dominate the whole drill just for
 * lacking data. Pure and exported for unit testing; always sums to
 * exactly `totalSize` when `totalSize >= subjects.length` (below that,
 * only the weakest `totalSize` subjects get an allocation of 1 each). */
export function allocateWeightedDrillSizes(
  subjects: { id: string; readinessPct: number | null }[],
  totalSize: number
): Record<string, number> {
  if (subjects.length === 0 || totalSize <= 0) return {};

  if (totalSize < subjects.length) {
    const weakestFirst = [...subjects].sort((a, b) => (a.readinessPct ?? 50) - (b.readinessPct ?? 50));
    const result: Record<string, number> = {};
    for (const s of weakestFirst.slice(0, totalSize)) result[s.id] = 1;
    return result;
  }

  const weights = subjects.map((s) => ({ id: s.id, weight: Math.max(1, 100 - (s.readinessPct ?? 50)) }));
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  // floor(exact) never exceeds exact, and the exacts sum to exactly
  // totalSize, so sum(floor(exact)) <= totalSize always — leftover here is
  // guaranteed non-negative, unlike a version that forced a minimum of 1
  // before redistributing (which could overshoot totalSize when many
  // subjects have small weights).
  const raw = weights.map((w) => {
    const exact = (w.weight / totalWeight) * totalSize;
    return { id: w.id, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  const result: Record<string, number> = {};
  for (const r of raw) result[r.id] = r.floor;

  let leftover = totalSize - Object.values(result).reduce((a, b) => a + b, 0);
  const byRemainderDesc = [...raw].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; leftover > 0; i = (i + 1) % byRemainderDesc.length) {
    result[byRemainderDesc[i].id] += 1;
    leftover -= 1;
  }

  // Enforce "never completely neglect a subject": any subject still at 0
  // steals one slot from whichever subject currently has the largest
  // allocation. Always resolvable without going negative anywhere, since
  // totalSize >= subjects.length is guaranteed in this branch.
  const ids = Object.keys(result);
  for (const id of ids) {
    while (result[id] === 0) {
      const richestId = ids.reduce((a, b) => (result[a] > result[b] ? a : b));
      result[richestId] -= 1;
      result[id] += 1;
    }
  }

  return result;
}
