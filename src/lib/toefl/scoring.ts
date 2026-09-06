import { TOEFL_CONFIG } from "@/lib/toefl/config";

/** Converts a raw correct/total count into the 0-6 TOEFL readiness scale.
 * Pure and exported so it's directly unit-testable — no DB/session
 * dependency, matching the pattern of the existing WAEC/UTME percentage
 * scoring in src/app/practice/actions.ts. */
export function computeSkillScore(correctCount: number, totalItems: number): number {
  if (totalItems <= 0) return 0;
  const { max } = TOEFL_CONFIG.scoreScale;
  return (correctCount / totalItems) * max;
}

/** Overall diagnostic score only ever reflects skills with a real
 * automated score today (Reading, Listening) — never fabricates a value
 * for Speaking/Writing, which have no evaluator yet. */
export function computeDiagnosticOverallScore(scores: (number | null)[]): number | null {
  const known = scores.filter((s): s is number => s !== null);
  if (known.length === 0) return null;
  return known.reduce((a, b) => a + b, 0) / known.length;
}
