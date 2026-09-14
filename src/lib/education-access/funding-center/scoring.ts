// Pure scoring/eligibility functions for the Grant & Funding Center
// (Education Access phase 4). No DB access here — callers pass the
// current subscores/checklist and get back a deterministic result, so
// this stays easy to unit test and impossible for totalScore/eligibility
// to drift from what's actually stored.

export type OpportunityScores = {
  missionScore: number | null;
  geographicScore: number | null;
  programScore: number | null;
  eligibilityScore: number | null;
  fundingScore: number | null;
  timingScore: number | null;
};

export type Classification = "PRIORITY" | "QUALIFIED" | "RESEARCH_FURTHER" | "LOW_PRIORITY";

export const SCORE_CATEGORY_MAX = {
  missionScore: 25,
  geographicScore: 20,
  programScore: 20,
  eligibilityScore: 20,
  fundingScore: 10,
  timingScore: 5,
} as const;

// Missing subscores count as 0 — an opportunity that hasn't been scored
// yet is LOW_PRIORITY by default, never silently treated as high-scoring.
export function computeTotalScore(scores: OpportunityScores): number {
  return (
    (scores.missionScore ?? 0) +
    (scores.geographicScore ?? 0) +
    (scores.programScore ?? 0) +
    (scores.eligibilityScore ?? 0) +
    (scores.fundingScore ?? 0) +
    (scores.timingScore ?? 0)
  );
}

const CLASSIFICATION_REASONING: Record<Classification, string> = {
  PRIORITY: "Strong candidate — high alignment across mission, geography, and program fit.",
  QUALIFIED: "Worth pursuing — solid alignment, though not the strongest possible fit.",
  RESEARCH_FURTHER: "Requires more investigation before committing time to an application.",
  LOW_PRIORITY: "Do not prioritize unless circumstances change — weak alignment or scoring incomplete.",
};

export function classifyOpportunity(totalScore: number): { classification: Classification; reasoning: string } {
  let classification: Classification;
  if (totalScore >= 80) classification = "PRIORITY";
  else if (totalScore >= 65) classification = "QUALIFIED";
  else if (totalScore >= 50) classification = "RESEARCH_FURTHER";
  else classification = "LOW_PRIORITY";
  return { classification, reasoning: CLASSIFICATION_REASONING[classification] };
}

export type EligibilityValue = "CONFIRMED" | "NOT_CONFIRMED" | "NOT_APPLICABLE" | "DISQUALIFIED";

export const ELIGIBILITY_REQUIREMENTS = [
  "Organization type accepted",
  "Country eligibility",
  "Geographic eligibility",
  "Program eligibility",
  "Revenue restrictions",
  "Nonprofit requirement",
  "Tax-exempt requirement",
  "Fiscal sponsor permitted",
  "Application invitation requirement",
  "Registration requirements",
  "Matching funds requirement",
  "Required operating history",
] as const;

export type EligibilityChecklist = Partial<Record<(typeof ELIGIBILITY_REQUIREMENTS)[number], EligibilityValue>>;

// A single DISQUALIFIED item makes the whole opportunity ineligible,
// regardless of fit score — this must never be bypassable (brief §7/§26).
export function computeEligibility(checklist: EligibilityChecklist | null | undefined): {
  eligible: boolean;
  disqualifyingItems: string[];
} {
  const disqualifyingItems = ELIGIBILITY_REQUIREMENTS.filter((item) => checklist?.[item] === "DISQUALIFIED");
  return { eligible: disqualifyingItems.length === 0, disqualifyingItems };
}

export function isStale(lastVerifiedAt: Date | null, thresholdDays: number): boolean {
  if (!lastVerifiedAt) return true;
  const ageMs = Date.now() - lastVerifiedAt.getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}

export type DeadlineUrgency = "30_DAYS" | "14_DAYS" | "7_DAYS" | "48_HOURS" | "OVERDUE" | null;

export function deadlineUrgency(deadline: Date | null, now: Date = new Date()): DeadlineUrgency {
  if (!deadline) return null;
  const msRemaining = deadline.getTime() - now.getTime();
  const hoursRemaining = msRemaining / (60 * 60 * 1000);
  if (hoursRemaining < 0) return "OVERDUE";
  if (hoursRemaining <= 48) return "48_HOURS";
  if (hoursRemaining <= 7 * 24) return "7_DAYS";
  if (hoursRemaining <= 14 * 24) return "14_DAYS";
  if (hoursRemaining <= 30 * 24) return "30_DAYS";
  return null;
}
