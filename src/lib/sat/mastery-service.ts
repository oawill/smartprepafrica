import type { SatSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const EMA_ALPHA = 0.3;
const CONFIDENCE_MAX_ATTEMPTS = 10;
const CONFIDENCE_TRUST_THRESHOLD = 0.15;

export type MasteryLabel = "Needs Practice" | "Developing" | "Proficient" | "Strong";

/** Updates one (section, domain, skill) bucket's mastery estimate after a
 * scored Drill answer, using the same EMA formula as StudentTopicMastery's
 * recordTopicAttempt (src/lib/ai/mastery-service.ts) — recent performance
 * matters more than old performance, and confidenceScore grows with volume
 * so a single lucky/unlucky answer can't swing a mastery label. Independent
 * implementation, not shared code, since the two models are unrelated
 * (SatSkillMastery has no Subject FK). Called per-answer, not batched at
 * drill submission, so mastery stays live even if a drill is abandoned
 * early. A null skill (SatContent.skill unset) normalizes to "" — the
 * table's sentinel for "domain-level only," required because Prisma can't
 * upsert against a compound unique key containing null. */
export async function recordSkillAttempt(params: {
  userId: string;
  section: SatSection;
  domain: string;
  skill: string | null;
  isCorrect: boolean;
}) {
  const { userId, section, domain, isCorrect } = params;
  const skill = params.skill ?? "";

  const existing = await prisma.satSkillMastery.findUnique({
    where: { userId_section_domain_skill: { userId, section, domain, skill } },
  });

  const outcome = isCorrect ? 100 : 0;
  const masteryScore = existing
    ? existing.masteryScore * (1 - EMA_ALPHA) + outcome * EMA_ALPHA
    : outcome;
  const questionsAttempted = (existing?.questionsAttempted ?? 0) + 1;
  const questionsCorrect = (existing?.questionsCorrect ?? 0) + (isCorrect ? 1 : 0);
  const confidenceScore = Math.min(1, questionsAttempted / CONFIDENCE_MAX_ATTEMPTS);

  await prisma.satSkillMastery.upsert({
    where: { userId_section_domain_skill: { userId, section, domain, skill } },
    update: { masteryScore, confidenceScore, questionsAttempted, questionsCorrect, lastPracticedAt: new Date() },
    create: {
      userId,
      section,
      domain,
      skill,
      masteryScore,
      confidenceScore,
      questionsAttempted,
      questionsCorrect,
      lastPracticedAt: new Date(),
    },
  });
}

/** Never returns a label without enough data to trust it — same
 * confidence gate (0.15) and weak/strong cutoffs (60/75) as the WAEC/UTME
 * precedent in src/lib/ai/mastery-service.ts, with an added top "Strong"
 * tier at 90+. Returns null (not a fabricated label) below the trust
 * threshold — the caller should render "Not enough data yet" or omit the
 * row entirely, never guess. */
export function masteryLabel(masteryScore: number, confidenceScore: number): MasteryLabel | null {
  if (confidenceScore <= CONFIDENCE_TRUST_THRESHOLD) return null;
  if (masteryScore < 60) return "Needs Practice";
  if (masteryScore < 75) return "Developing";
  if (masteryScore < 90) return "Proficient";
  return "Strong";
}

export type DomainMastery = {
  domain: string;
  masteryScore: number;
  confidenceScore: number;
  questionsAttempted: number;
  label: MasteryLabel | null;
};

/** Read-time rollup of every skill-level mastery row within one domain
 * (including the "" domain-level-only bucket), weighted by
 * questionsAttempted — not a separately stored value, so there's only
 * ever one source of truth to update. */
export async function getDomainMastery(
  userId: string,
  section: SatSection,
  domain: string
): Promise<DomainMastery | null> {
  const rows = await prisma.satSkillMastery.findMany({ where: { userId, section, domain } });
  if (rows.length === 0) return null;

  const questionsAttempted = rows.reduce((sum, r) => sum + r.questionsAttempted, 0);
  if (questionsAttempted === 0) return null;

  const masteryScore = rows.reduce((sum, r) => sum + r.masteryScore * r.questionsAttempted, 0) / questionsAttempted;
  const confidenceScore = Math.min(1, questionsAttempted / CONFIDENCE_MAX_ATTEMPTS);

  return {
    domain,
    masteryScore,
    confidenceScore,
    questionsAttempted,
    label: masteryLabel(masteryScore, confidenceScore),
  };
}

/** All of a student's skill-level mastery rows for a section, ordered
 * weakest-first. A row with skill === "" represents domain-level-only
 * tracking (the underlying content had no finer skill tag) — callers that
 * want a real sub-skill to target should filter those out. */
export async function listSkillMastery(userId: string, section: SatSection) {
  return prisma.satSkillMastery.findMany({
    where: { userId, section },
    orderBy: { masteryScore: "asc" },
  });
}
