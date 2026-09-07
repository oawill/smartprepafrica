import type { SatSection, Difficulty, SatContent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { selectSatContent } from "@/lib/sat/content-selection";
import { computeStudyPlan } from "@/lib/sat/study-plan-service";
import { listSkillMastery } from "@/lib/sat/mastery-service";
import { SAT_CONFIG } from "@/lib/sat/config";

const STALE_DAYS = 7;

export type Exposure = { seenCount: number; everIncorrect: boolean; mostRecentStartedAt: Date };

/** A student's exposure to a set of questions, derived entirely from their
 * existing SatAttemptItem history — no separate "seen questions" table.
 * An in-progress, unsubmitted attempt's answered items still count as
 * "seen": the student has looked at the question regardless of whether
 * they've clicked Submit on the attempt yet. */
async function getExposureMap(userId: string, contentIds: string[]): Promise<Map<string, Exposure>> {
  if (contentIds.length === 0) return new Map();

  const items = await prisma.satAttemptItem.findMany({
    where: { contentId: { in: contentIds }, attempt: { userId } },
    select: { contentId: true, isCorrect: true, attempt: { select: { startedAt: true } } },
  });

  const map = new Map<string, Exposure>();
  for (const item of items) {
    const existing = map.get(item.contentId);
    const wasIncorrect = item.isCorrect === false;
    if (!existing) {
      map.set(item.contentId, {
        seenCount: 1,
        everIncorrect: wasIncorrect,
        mostRecentStartedAt: item.attempt.startedAt,
      });
    } else {
      existing.seenCount += 1;
      existing.everIncorrect = existing.everIncorrect || wasIncorrect;
      if (item.attempt.startedAt > existing.mostRecentStartedAt) {
        existing.mostRecentStartedAt = item.attempt.startedAt;
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

export type ExposureTiers<T> = {
  unseen: T[];
  previouslyIncorrect: T[];
  staleCorrect: T[];
  recentCorrect: T[];
};

/** Pure bucketing step of selectDrillContent, extracted for unit testing:
 * unseen questions first, then previously-incorrect (reinforcement), then
 * correct-but-stale, then correct-and-recent (least useful to repeat).
 * Ordering within a tier is the caller's job (selectDrillContent shuffles
 * each tier before concatenating). */
export function tierContentByExposure<T extends { id: string }>(
  pool: T[],
  exposure: Map<string, Exposure>,
  now: Date,
  staleDays = STALE_DAYS
): ExposureTiers<T> {
  const staleCutoff = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);
  const tiers: ExposureTiers<T> = { unseen: [], previouslyIncorrect: [], staleCorrect: [], recentCorrect: [] };

  for (const content of pool) {
    const exp = exposure.get(content.id);
    if (!exp) {
      tiers.unseen.push(content);
    } else if (exp.everIncorrect) {
      tiers.previouslyIncorrect.push(content);
    } else if (exp.mostRecentStartedAt < staleCutoff) {
      tiers.staleCorrect.push(content);
    } else {
      tiers.recentCorrect.push(content);
    }
  }
  return tiers;
}

export type DrillContentParams = {
  userId: string;
  section: SatSection;
  domain?: string;
  skill?: string;
  difficulty?: Difficulty | Difficulty[];
  size: number;
  excludeIds?: string[];
};

/** Selects up to `size` questions for a drill, avoiding repeats: unseen
 * questions first, then previously-incorrect ones (reinforcement),
 * then questions answered correctly a while ago, then ones answered
 * correctly recently (lowest priority — least useful to repeat).
 * Randomizes within each tier while respecting the requested domain,
 * skill, and difficulty filters. Returns fewer than `size` gracefully
 * when the eligible pool is small — never throws unless the pool is
 * completely empty. */
export async function selectDrillContent(params: DrillContentParams): Promise<SatContent[]> {
  const pool = await selectSatContent({
    section: params.section,
    domain: params.domain,
    skill: params.skill,
    difficulty: params.difficulty,
    excludeIds: params.excludeIds,
  });
  if (pool.length === 0) return [];

  const exposure = await getExposureMap(params.userId, pool.map((c) => c.id));
  const tiers = tierContentByExposure(pool, exposure, new Date());

  const ordered = [
    ...shuffle(tiers.unseen),
    ...shuffle(tiers.previouslyIncorrect),
    ...shuffle(tiers.staleCorrect),
    ...shuffle(tiers.recentCorrect),
  ];

  return ordered.slice(0, params.size);
}

export type DrillTarget = { section: SatSection; domain?: string; skill?: string; label: string };

/** The domain/skill buckets an adaptive or daily drill should draw from —
 * lexicographic composition, not a weighted score: computeStudyPlan
 * (existing, unmodified) ranks WHICH domains to target (unpracticed
 * domains first, then weak domains worst-first); within each domain, that
 * domain's SatSkillMastery rows rank WHICH skill to draw from (weakest
 * first, or the whole domain if no skill-level data exists yet). No
 * difficulty weighting and no separate recency-decay signal — the EMA
 * mastery score is already recency-weighted, and difficulty-aware
 * targeting is deferred to a later version rather than guessed at now. */
async function computeDrillTargets(userId: string): Promise<DrillTarget[]> {
  const studyPlan = await computeStudyPlan(userId);
  if (studyPlan.focusAreas.length === 0) {
    // Brand new student, no attempt history yet — fall back to a general
    // Reading & Writing drill rather than returning nothing.
    return [{ section: "READING_WRITING", label: "Reading & Writing" }];
  }

  const targets: DrillTarget[] = [];
  for (const area of studyPlan.focusAreas) {
    const skillRows = await listSkillMastery(userId, area.section);
    const weakestInDomain = skillRows.find((r) => r.domain === area.domain && r.skill);
    targets.push({
      section: area.section,
      domain: area.domain,
      skill: weakestInDomain?.skill ?? undefined,
      label: weakestInDomain?.skill ?? area.domain,
    });
  }
  return targets;
}

export type AdaptiveDrillPlan = { items: SatContent[]; targets: DrillTarget[]; primaryLabel: string };

/** Builds an adaptive drill's question set by drawing from each target
 * bucket in turn (roughly evenly), deduplicating across buckets. Used for
 * both "Adaptive Drill — Recommended for You" and "Today's SAT Drill" —
 * the latter is the same computation at a different default size, since
 * the exposure tiering inside selectDrillContent already naturally mixes
 * in previously-incorrect ("previously learned") questions alongside
 * unseen ones from weak areas, satisfying "a combination of weak areas
 * and previously learned skills" without separate logic. */
export async function computeAdaptiveDrillPlan(userId: string, size: number): Promise<AdaptiveDrillPlan> {
  const targets = await computeDrillTargets(userId);
  const perTarget = Math.ceil(size / targets.length);

  const items: SatContent[] = [];
  const seenIds = new Set<string>();
  for (const target of targets) {
    if (items.length >= size) break;
    const picked = await selectDrillContent({
      userId,
      section: target.section,
      domain: target.domain,
      skill: target.skill,
      size: perTarget,
      excludeIds: [...seenIds],
    });
    for (const c of picked) {
      if (items.length >= size) break;
      items.push(c);
      seenIds.add(c.id);
    }
  }

  return { items: items.slice(0, size), targets, primaryLabel: targets[0]?.label ?? "Mixed Practice" };
}

/** Creates a drill attempt from an explicit student-chosen section/domain/
 * skill/difficulty. */
export async function createDrillAttempt(params: {
  userId: string;
  section: SatSection;
  domain?: string;
  skill?: string;
  difficulty?: Difficulty;
  size: number;
}): Promise<string> {
  const content = await selectDrillContent({
    userId: params.userId,
    section: params.section,
    domain: params.domain,
    skill: params.skill,
    difficulty: params.difficulty,
    size: params.size,
  });
  if (content.length === 0) {
    throw new Error("No drill questions are available for this selection yet.");
  }

  const attempt = await prisma.satAttempt.create({
    data: {
      userId: params.userId,
      kind: "DRILL",
      section: params.section,
      items: { create: content.map((c, i) => ({ contentId: c.id, order: i })) },
    },
  });
  return attempt.id;
}

/** Creates an adaptive (or daily) drill attempt — may span both SAT
 * sections, so `section` stays null on the attempt (same convention
 * createDiagnosticAttempt already uses for cross-section attempts). */
export async function createAdaptiveDrillAttempt(userId: string, size: number): Promise<string> {
  const plan = await computeAdaptiveDrillPlan(userId, size);
  if (plan.items.length === 0) {
    throw new Error("No drill questions are available yet.");
  }

  const attempt = await prisma.satAttempt.create({
    data: {
      userId,
      kind: "DRILL",
      items: { create: plan.items.map((c, i) => ({ contentId: c.id, order: i })) },
    },
  });
  return attempt.id;
}

/** Sets submittedAt only — deliberately does NOT write readingWritingScore/
 * mathScore (unlike submitSkillAttempt), so short drill results never
 * pollute the student's tracked section-score history. Drill Complete's
 * score/accuracy/duration are all computed at read-time from the
 * attempt's items and startedAt/submittedAt, not stored redundantly. */
export async function submitDrillAttempt(attemptId: string, userId: string) {
  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true, submittedAt: true, kind: true },
  });
  if (!attempt || attempt.userId !== userId || attempt.kind !== "DRILL") {
    throw new Error("Drill not found.");
  }
  if (attempt.submittedAt) return;

  await prisma.satAttempt.update({ where: { id: attemptId }, data: { submittedAt: new Date() } });
}

/** Appends one more question testing the same (section, domain, skill,
 * difficulty) as an existing item, as a new SatAttemptItem on the SAME
 * attempt — keeps "Practice Another Like This" inside the same drill/
 * history entry rather than spawning a separate attempt. Relaxes the
 * skill and then difficulty filters if no exact match is available,
 * rather than failing outright. Returns null if nothing suitable exists
 * at all. */
export async function practiceAnotherLikeThis(
  attemptId: string,
  itemId: string,
  userId: string
): Promise<{ itemId: string; contentId: string } | null> {
  const [attempt, sourceItem] = await Promise.all([
    prisma.satAttempt.findUnique({ where: { id: attemptId }, select: { userId: true, kind: true } }),
    prisma.satAttemptItem.findUnique({
      where: { id: itemId },
      select: { id: true, order: true, content: { select: { section: true, domain: true, skill: true, difficulty: true } } },
    }),
  ]);
  if (!attempt || attempt.userId !== userId || attempt.kind !== "DRILL" || !sourceItem) {
    throw new Error("Drill item not found.");
  }

  const existingContentIds = (
    await prisma.satAttemptItem.findMany({ where: { attemptId }, select: { contentId: true } })
  ).map((i) => i.contentId);

  const attempts: DrillContentParams[] = [
    {
      userId,
      section: sourceItem.content.section,
      domain: sourceItem.content.domain,
      skill: sourceItem.content.skill ?? undefined,
      difficulty: sourceItem.content.difficulty,
      size: 1,
      excludeIds: existingContentIds,
    },
    {
      userId,
      section: sourceItem.content.section,
      domain: sourceItem.content.domain,
      skill: sourceItem.content.skill ?? undefined,
      size: 1,
      excludeIds: existingContentIds,
    },
    {
      userId,
      section: sourceItem.content.section,
      domain: sourceItem.content.domain,
      size: 1,
      excludeIds: existingContentIds,
    },
  ];

  let picked: SatContent | undefined;
  for (const p of attempts) {
    const result = await selectDrillContent(p);
    if (result.length > 0) {
      picked = result[0];
      break;
    }
  }
  if (!picked) return null;

  const maxOrder = await prisma.satAttemptItem.aggregate({ where: { attemptId }, _max: { order: true } });
  const newItem = await prisma.satAttemptItem.create({
    data: { attemptId, contentId: picked.id, order: (maxOrder._max.order ?? 0) + 1 },
  });

  return { itemId: newItem.id, contentId: picked.id };
}

export function drillSizeLabel(size: number): string {
  const entry = Object.entries(SAT_CONFIG.drill.sizes).find(([, v]) => v === size);
  return entry ? entry[0] : `${size} questions`;
}
