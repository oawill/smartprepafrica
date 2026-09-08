/** Average a set of ExamAttempt-shaped scores, ignoring ungraded/null
 * ones — never returns 0 or NaN for an empty/all-null set, matching this
 * app's existing convention (Prep readiness's ReadinessStatus.NOT_ENOUGH_DATA
 * is the same idea) of distinguishing "no data" from "a real zero score". */
export function averageScore(attempts: { score: number | null }[]): number | null {
  const scored = attempts.filter((a): a is { score: number } => a.score !== null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, a) => sum + a.score, 0) / scored.length);
}

/** Below this many graded attempts, a raw average is more likely to
 * mislead than inform — shown as "Not enough data yet" instead. */
export const MIN_BENCHMARK_SAMPLE_SIZE = 5;
