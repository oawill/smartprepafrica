// Pure scoring/eligibility functions for the Grant & Funding Center
// (Education Access phases 4-5). No DB access here — callers pass the
// current subscores/checklist and get back a deterministic result, so
// this stays easy to unit test and impossible for totalScore/eligibility
// to drift from what's actually stored.

// Phase 5 §9 — the "SmartPrepAfrica Funding Fit Score": eight categories
// summing to 100. Deliberately does NOT include eligibility — see
// computeEligibilityStatus below, which is graded completely separately
// (brief explicitly: "Keep eligibility separate").
export type OpportunityScores = {
  educationScore: number | null;
  nigeriaAfricaScore: number | null;
  educationAccessScore: number | null;
  digitalLearningScore: number | null;
  aiTechScore: number | null;
  youthScore: number | null;
  fundingPotentialScore: number | null;
  timingScore: number | null;
};

export type Classification = "PRIORITY" | "QUALIFIED" | "RESEARCH_FURTHER" | "LOW_PRIORITY";

export const SCORE_CATEGORY_MAX = {
  educationScore: 20,
  nigeriaAfricaScore: 20,
  educationAccessScore: 15,
  digitalLearningScore: 15,
  aiTechScore: 10,
  youthScore: 10,
  fundingPotentialScore: 5,
  timingScore: 5,
} as const;

export const SCORE_CATEGORY_LABELS: Record<keyof OpportunityScores, string> = {
  educationScore: "Education Alignment",
  nigeriaAfricaScore: "Nigeria/Africa Alignment",
  educationAccessScore: "Education Access Alignment",
  digitalLearningScore: "Digital Learning / EdTech",
  aiTechScore: "AI & Technology Alignment",
  youthScore: "Youth / Secondary Education",
  fundingPotentialScore: "Funding Potential",
  timingScore: "Timing",
};

// Missing subscores count as 0 — an opportunity that hasn't been scored
// yet is LOW_PRIORITY by default, never silently treated as high-scoring.
export function computeTotalScore(scores: OpportunityScores): number {
  return (
    (scores.educationScore ?? 0) +
    (scores.nigeriaAfricaScore ?? 0) +
    (scores.educationAccessScore ?? 0) +
    (scores.digitalLearningScore ?? 0) +
    (scores.aiTechScore ?? 0) +
    (scores.youthScore ?? 0) +
    (scores.fundingPotentialScore ?? 0) +
    (scores.timingScore ?? 0)
  );
}

const CLASSIFICATION_REASONING: Record<Classification, string> = {
  PRIORITY: "Strong candidate — high alignment across education, geography, and program fit.",
  QUALIFIED: "Worth pursuing — solid alignment, though not the strongest possible fit.",
  RESEARCH_FURTHER: "Requires more investigation before committing time to an application.",
  LOW_PRIORITY: "Do not prioritize unless circumstances change — weak alignment or scoring incomplete.",
};

// Fit only — never blended with eligibility. A NOT_ELIGIBLE record can
// still classify as PRIORITY on fit alone; callers must check eligibility
// separately before treating anything as recommendable (see isRecommended).
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

// The two checklist items where SmartPrepAfrica's actual legal status
// (a private company, not a registered nonprofit) is the concern — brief
// §7's "Potential Eligibility Barrier" case.
const BARRIER_REQUIREMENTS = ["Nonprofit requirement", "Tax-exempt requirement"] as const;

export type FunderEligibilityPermits = {
  permitsFiscalSponsorship?: boolean | null;
  permitsInternationalOrgs?: boolean | null;
  permitsForProfitSocialEnterprise?: boolean | null;
  permitsCorporatePartnership?: boolean | null;
  permitsProgramRelatedInvestment?: boolean | null;
  permitsDirectInternationalGrants?: boolean | null;
};

// Legacy Phase 4 boolean shape — a single DISQUALIFIED item makes the
// whole opportunity ineligible. Kept for the two call sites that only
// need a simple yes/no (e.g. earlier admin list rendering); prefer
// computeEligibilityStatus for anything user-facing going forward.
export function computeEligibility(checklist: EligibilityChecklist | null | undefined): {
  eligible: boolean;
  disqualifyingItems: string[];
} {
  const disqualifyingItems = ELIGIBILITY_REQUIREMENTS.filter((item) => checklist?.[item] === "DISQUALIFIED");
  return { eligible: disqualifyingItems.length === 0, disqualifyingItems };
}

export type EligibilityStatus = "ELIGIBLE" | "POTENTIALLY_ELIGIBLE" | "REQUIRES_CONFIRMATION" | "NOT_ELIGIBLE";

// Phase 5 §7/§8 — a graded, non-numeric gate kept fully separate from the
// fit score. Any DISQUALIFIED item, or a barrier requirement
// (nonprofit/tax-exempt) left NOT_CONFIRMED with no plausible funder-side
// workaround, makes the opportunity NOT_ELIGIBLE regardless of score.
export function computeEligibilityStatus(
  checklist: EligibilityChecklist | null | undefined,
  funderPermits?: FunderEligibilityPermits | null
): { status: EligibilityStatus; barrierWarning: boolean; reasons: string[] } {
  const values = ELIGIBILITY_REQUIREMENTS.map((item) => checklist?.[item]);
  const disqualified = ELIGIBILITY_REQUIREMENTS.filter((item) => checklist?.[item] === "DISQUALIFIED");
  if (disqualified.length > 0) {
    return { status: "NOT_ELIGIBLE", barrierWarning: false, reasons: disqualified.map((r) => `${r}: disqualified`) };
  }

  const hasWorkaround = Boolean(
    funderPermits &&
      (funderPermits.permitsFiscalSponsorship ||
        funderPermits.permitsInternationalOrgs ||
        funderPermits.permitsForProfitSocialEnterprise ||
        funderPermits.permitsCorporatePartnership ||
        funderPermits.permitsProgramRelatedInvestment ||
        funderPermits.permitsDirectInternationalGrants)
  );

  const unresolvedBarriers = BARRIER_REQUIREMENTS.filter((item) => checklist?.[item] === "NOT_CONFIRMED");
  if (unresolvedBarriers.length > 0 && !hasWorkaround) {
    return {
      status: "NOT_ELIGIBLE",
      barrierWarning: true,
      reasons: unresolvedBarriers.map(
        (r) => `Potential Eligibility Barrier: ${r} — SmartPrepAfrica is a private company, not a registered nonprofit, and no funder workaround (fiscal sponsorship, international orgs, for-profit social enterprise, corporate partnership, PRI, or direct international grants) is confirmed.`
      ),
    };
  }

  const otherUnresolved = ELIGIBILITY_REQUIREMENTS.filter(
    (item) => checklist?.[item] === "NOT_CONFIRMED" && !(BARRIER_REQUIREMENTS as readonly string[]).includes(item)
  );
  if (otherUnresolved.length > 0 || unresolvedBarriers.length > 0) {
    return {
      status: "REQUIRES_CONFIRMATION",
      barrierWarning: unresolvedBarriers.length > 0,
      reasons: [...unresolvedBarriers, ...otherUnresolved].map((r) => `${r}: needs confirmation`),
    };
  }

  const allSet = values.every((v) => v === "CONFIRMED" || v === "NOT_APPLICABLE");
  if (allSet) {
    return { status: "ELIGIBLE", barrierWarning: false, reasons: [] };
  }

  return { status: "POTENTIALLY_ELIGIBLE", barrierWarning: false, reasons: [] };
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

// Phase 5 §10 — the exact "Recommended" gate. Never true for a
// NOT_ELIGIBLE record regardless of score; never true without a source.
export function isRecommended(params: {
  eligibilityStatus: EligibilityStatus;
  sourceUrl: string | null | undefined;
  deadline: Date | null;
  rollingDeadline: boolean;
  totalScore: number;
  threshold: number;
  now?: Date;
}): boolean {
  if (params.eligibilityStatus === "NOT_ELIGIBLE") return false;
  if (!params.sourceUrl) return false;
  const urgency = deadlineUrgency(params.deadline, params.now);
  if (urgency === "OVERDUE" && !params.rollingDeadline) return false;
  if (params.totalScore < params.threshold) return false;
  return true;
}

// Phase 5 §12 — always paired with the number, never shown alone.
export function explainFit(
  scores: OpportunityScores,
  eligibilityStatus: EligibilityStatus,
  eligibilityReasons: string[],
  deadline: Date | null,
  rollingDeadline: boolean
): { strengths: string[]; concerns: string[] } {
  const strengths: string[] = [];
  const concerns: string[] = [];

  if ((scores.educationScore ?? 0) >= 15) strengths.push("Strong education-sector alignment");
  if ((scores.nigeriaAfricaScore ?? 0) >= 15) strengths.push("Nigeria/Africa geographic alignment");
  if ((scores.educationAccessScore ?? 0) >= 10) strengths.push("Fits the Education Access Initiative directly");
  if ((scores.digitalLearningScore ?? 0) >= 10) strengths.push("Digital learning is an eligible activity");
  if ((scores.aiTechScore ?? 0) >= 7) strengths.push("AI/technology alignment");
  if ((scores.youthScore ?? 0) >= 7) strengths.push("Youth/secondary-education alignment");

  if (eligibilityStatus === "REQUIRES_CONFIRMATION" || eligibilityStatus === "NOT_ELIGIBLE") {
    concerns.push(...eligibilityReasons);
  }
  const urgency = deadlineUrgency(deadline);
  if (urgency === "30_DAYS" || urgency === "14_DAYS" || urgency === "7_DAYS" || urgency === "48_HOURS") {
    concerns.push(`Deadline is approaching (${urgency.replace("_", " ").toLowerCase()})`);
  }
  if (urgency === "OVERDUE" && !rollingDeadline) {
    concerns.push("Deadline has passed");
  }

  return { strengths, concerns };
}

// Phase 5 §21 — evaluates the funder overall, independent of any specific
// live opportunity. Useful for deciding who's worth a watchlist entry.
export function computeFunderFitScore(funder: {
  educationFocus: boolean;
  africaFocus: boolean;
  nigeriaFocus: boolean;
  technologyFocus: boolean;
  youthFocus: boolean;
  permitsFiscalSponsorship?: boolean | null;
  permitsInternationalOrgs?: boolean | null;
  permitsForProfitSocialEnterprise?: boolean | null;
  permitsCorporatePartnership?: boolean | null;
  permitsProgramRelatedInvestment?: boolean | null;
  permitsDirectInternationalGrants?: boolean | null;
  typicalMinGrantMinor?: number | null;
  typicalMaxGrantMinor?: number | null;
}): number {
  let score = 0;
  if (funder.educationFocus) score += 25;
  if (funder.africaFocus) score += 20;
  if (funder.nigeriaFocus) score += 15;
  if (funder.technologyFocus) score += 15;
  if (funder.youthFocus) score += 10;
  const eligibilityCompatible =
    funder.permitsFiscalSponsorship ||
    funder.permitsInternationalOrgs ||
    funder.permitsForProfitSocialEnterprise ||
    funder.permitsCorporatePartnership ||
    funder.permitsProgramRelatedInvestment ||
    funder.permitsDirectInternationalGrants;
  if (eligibilityCompatible) score += 10;
  if (funder.typicalMinGrantMinor != null || funder.typicalMaxGrantMinor != null) score += 5;
  return Math.min(100, score);
}

export type DiscoveryConfidence = "HIGH" | "MEDIUM" | "LOW";

// Phase 5 §32 — never conflated with fit score; purely about how much to
// trust the discovered data itself.
export function computeDiscoveryConfidence(discovery: {
  sourceUrl: string | null | undefined;
  verificationChecklist: EligibilityChecklist | null | undefined;
  deadline: Date | null;
  rollingDeadline: boolean;
  minimumAwardMinor: number | null;
  maximumAwardMinor: number | null;
  lastCheckedAt: Date | null;
}): DiscoveryConfidence {
  let points = 0;
  if (discovery.sourceUrl) points += 1;
  const checklistValues = Object.values(discovery.verificationChecklist ?? {});
  const checklistComplete = checklistValues.length >= ELIGIBILITY_REQUIREMENTS.length;
  if (checklistComplete) points += 1;
  if (discovery.deadline || discovery.rollingDeadline) points += 1;
  if (discovery.minimumAwardMinor != null || discovery.maximumAwardMinor != null) points += 1;
  if (discovery.lastCheckedAt && !isStale(discovery.lastCheckedAt, 30)) points += 1;

  if (points >= 4) return "HIGH";
  if (points >= 2) return "MEDIUM";
  return "LOW";
}

// Phase 5 §25/§26 — computed only from real EducationAccessReadinessItem
// records, never fabricated.
export function computeReadinessScore(items: { label: string; status: string }[]): {
  percent: number;
  missing: string[];
} {
  if (items.length === 0) return { percent: 0, missing: [] };
  const available = items.filter((i) => i.status === "AVAILABLE").length;
  const missing = items.filter((i) => i.status !== "AVAILABLE").map((i) => i.label);
  return { percent: Math.round((available / items.length) * 100), missing };
}
