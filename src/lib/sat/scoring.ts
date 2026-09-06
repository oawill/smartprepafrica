import { SAT_CONFIG } from "@/lib/sat/config";

/** SmartPrepAfrica's own linear approximation of a 200-800 section
 * score from raw correctness — NOT the real SAT scoring curve (which
 * is proprietary and depends on the adaptive module a student actually
 * received). Every place this number is shown must be labeled
 * "SmartPrepAfrica Estimated," per the brief's explicit non-affiliation
 * requirement — never presented as an official College Board score.
 * Pure and exported so it's directly unit-testable, matching
 * src/lib/toefl/scoring.ts's computeSkillScore precedent. */
export function computeSectionScore(correctCount: number, totalItems: number): number {
  const { sectionMin, sectionMax } = SAT_CONFIG.scoreScale;
  if (totalItems <= 0) return sectionMin;
  const pct = correctCount / totalItems;
  const raw = sectionMin + pct * (sectionMax - sectionMin);
  // Round to the nearest 10 — matches real SAT score granularity
  // cosmetically, not a claim about precision.
  return Math.round(raw / 10) * 10;
}
