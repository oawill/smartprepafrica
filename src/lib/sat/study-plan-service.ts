import { prisma } from "@/lib/prisma";
import type { SatSection } from "@prisma/client";

export type DomainStat = {
  section: SatSection;
  domain: string;
  attempted: number;
  correct: number;
};

export type FocusArea = {
  section: SatSection;
  domain: string;
  accuracy: number | null; // null means never attempted
  attempted: number;
  reason: "unpracticed" | "weak";
};

export type StudyPlan = {
  hasAnyData: boolean;
  focusAreas: FocusArea[];
  recommendedNext: { label: string; href: string } | null;
};

const WEAK_ACCURACY_THRESHOLD = 0.7;
const MAX_FOCUS_AREAS = 4;

const SECTION_HREF: Record<SatSection, string> = {
  READING_WRITING: "/international-exams/sat/reading-writing",
  MATH: "/international-exams/sat/math",
};

/** Pure ranking: given every domain that has PUBLISHED content (the
 * "universe") and the student's real per-domain stats from submitted
 * attempts, surfaces what to focus on next — domains never attempted
 * first (nothing to rank by accuracy), then attempted domains below
 * the weak-accuracy threshold, worst accuracy first. Never fabricates
 * a number: an unpracticed domain gets `accuracy: null`, not a 0%. */
export function rankFocusAreas(
  allDomains: { section: SatSection; domain: string }[],
  stats: DomainStat[]
): FocusArea[] {
  const statByKey = new Map(stats.map((s) => [`${s.section}::${s.domain}`, s]));

  const unpracticed: FocusArea[] = [];
  const weak: FocusArea[] = [];

  for (const { section, domain } of allDomains) {
    const stat = statByKey.get(`${section}::${domain}`);
    if (!stat || stat.attempted === 0) {
      unpracticed.push({ section, domain, accuracy: null, attempted: 0, reason: "unpracticed" });
      continue;
    }
    const accuracy = stat.correct / stat.attempted;
    if (accuracy < WEAK_ACCURACY_THRESHOLD) {
      weak.push({ section, domain, accuracy, attempted: stat.attempted, reason: "weak" });
    }
  }

  weak.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));

  return [...unpracticed, ...weak].slice(0, MAX_FOCUS_AREAS);
}

export async function computeStudyPlan(userId: string): Promise<StudyPlan> {
  const [publishedDomains, attempts] = await Promise.all([
    prisma.satContent.findMany({
      where: { status: "PUBLISHED" },
      select: { section: true, domain: true },
      distinct: ["section", "domain"],
    }),
    prisma.satAttempt.findMany({
      where: { userId, submittedAt: { not: null } },
      include: { items: { include: { content: { select: { section: true, domain: true } } } } },
    }),
  ]);

  const statMap = new Map<string, DomainStat>();
  for (const attempt of attempts) {
    for (const item of attempt.items) {
      if (item.isCorrect === null) continue;
      const key = `${item.content.section}::${item.content.domain}`;
      const existing = statMap.get(key) ?? {
        section: item.content.section,
        domain: item.content.domain,
        attempted: 0,
        correct: 0,
      };
      existing.attempted += 1;
      if (item.isCorrect) existing.correct += 1;
      statMap.set(key, existing);
    }
  }

  const focusAreas = rankFocusAreas(publishedDomains, [...statMap.values()]);
  const hasAnyData = attempts.length > 0;

  let recommendedNext: StudyPlan["recommendedNext"] = null;
  if (!hasAnyData) {
    recommendedNext = { label: "Take the Diagnostic Test to find your starting point", href: "/international-exams/sat/diagnostic" };
  } else if (focusAreas.length > 0) {
    const top = focusAreas[0];
    recommendedNext = {
      label: `Practice ${top.domain}`,
      href: SECTION_HREF[top.section],
    };
  }

  return { hasAnyData, focusAreas, recommendedNext };
}
