import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeTotalScore,
  classifyOpportunity,
  computeEligibility,
  computeEligibilityStatus,
  isRecommended,
  explainFit,
  computeFunderFitScore,
  computeDiscoveryConfidence,
  computeReadinessScore,
  isStale,
  deadlineUrgency,
} from "../../src/lib/education-access/funding-center/scoring";

describe("computeTotalScore", () => {
  test("sums all eight subscores", () => {
    const total = computeTotalScore({
      educationScore: 20,
      nigeriaAfricaScore: 20,
      educationAccessScore: 15,
      digitalLearningScore: 15,
      aiTechScore: 10,
      youthScore: 10,
      fundingPotentialScore: 5,
      timingScore: 5,
    });
    assert.equal(total, 100);
  });

  test("treats missing subscores as 0, never as fully scored", () => {
    const total = computeTotalScore({
      educationScore: 20,
      nigeriaAfricaScore: null,
      educationAccessScore: null,
      digitalLearningScore: null,
      aiTechScore: null,
      youthScore: null,
      fundingPotentialScore: null,
      timingScore: null,
    });
    assert.equal(total, 20);
  });

  test("an entirely unscored opportunity totals 0", () => {
    const total = computeTotalScore({
      educationScore: null,
      nigeriaAfricaScore: null,
      educationAccessScore: null,
      digitalLearningScore: null,
      aiTechScore: null,
      youthScore: null,
      fundingPotentialScore: null,
      timingScore: null,
    });
    assert.equal(total, 0);
  });
});

describe("classifyOpportunity", () => {
  test("80-100 is PRIORITY", () => {
    assert.equal(classifyOpportunity(80).classification, "PRIORITY");
    assert.equal(classifyOpportunity(100).classification, "PRIORITY");
  });

  test("65-79 is QUALIFIED", () => {
    assert.equal(classifyOpportunity(65).classification, "QUALIFIED");
    assert.equal(classifyOpportunity(79).classification, "QUALIFIED");
  });

  test("50-64 is RESEARCH_FURTHER", () => {
    assert.equal(classifyOpportunity(50).classification, "RESEARCH_FURTHER");
    assert.equal(classifyOpportunity(64).classification, "RESEARCH_FURTHER");
  });

  test("below 50 is LOW_PRIORITY", () => {
    assert.equal(classifyOpportunity(49).classification, "LOW_PRIORITY");
    assert.equal(classifyOpportunity(0).classification, "LOW_PRIORITY");
  });

  test("always includes non-empty reasoning, not just a number", () => {
    for (const score of [10, 55, 70, 90]) {
      assert.ok(classifyOpportunity(score).reasoning.length > 0);
    }
  });
});

describe("computeEligibility (legacy boolean shape)", () => {
  test("no checklist at all is eligible (nothing disqualified yet)", () => {
    assert.equal(computeEligibility(null).eligible, true);
    assert.equal(computeEligibility(undefined).eligible, true);
  });

  test("a single DISQUALIFIED item makes the whole opportunity ineligible", () => {
    const result = computeEligibility({
      "Organization type accepted": "CONFIRMED",
      "Nonprofit requirement": "DISQUALIFIED",
    });
    assert.equal(result.eligible, false);
    assert.deepEqual(result.disqualifyingItems, ["Nonprofit requirement"]);
  });
});

describe("computeEligibilityStatus", () => {
  test("empty checklist is POTENTIALLY_ELIGIBLE, not assumed eligible", () => {
    const result = computeEligibilityStatus(null);
    assert.equal(result.status, "POTENTIALLY_ELIGIBLE");
  });

  test("any DISQUALIFIED item is NOT_ELIGIBLE regardless of everything else", () => {
    const result = computeEligibilityStatus({ "Country eligibility": "DISQUALIFIED" });
    assert.equal(result.status, "NOT_ELIGIBLE");
  });

  test("Potential Eligibility Barrier: nonprofit requirement unconfirmed with no funder workaround is NOT_ELIGIBLE", () => {
    const result = computeEligibilityStatus({ "Nonprofit requirement": "NOT_CONFIRMED" }, null);
    assert.equal(result.status, "NOT_ELIGIBLE");
    assert.equal(result.barrierWarning, true);
    assert.ok(result.reasons.some((r) => r.includes("Potential Eligibility Barrier")));
  });

  test("nonprofit requirement unconfirmed but funder permits fiscal sponsorship is only REQUIRES_CONFIRMATION, not NOT_ELIGIBLE", () => {
    const result = computeEligibilityStatus(
      { "Nonprofit requirement": "NOT_CONFIRMED" },
      { permitsFiscalSponsorship: true }
    );
    assert.equal(result.status, "REQUIRES_CONFIRMATION");
  });

  test("a high score cannot override NOT_ELIGIBLE — eligibility never looks at score", () => {
    // Documents the contract: this function takes no score argument at all.
    const result = computeEligibilityStatus({ "Tax-exempt requirement": "DISQUALIFIED" });
    assert.equal(result.status, "NOT_ELIGIBLE");
  });

  test("a non-barrier NOT_CONFIRMED item is REQUIRES_CONFIRMATION", () => {
    const result = computeEligibilityStatus({ "Country eligibility": "NOT_CONFIRMED" });
    assert.equal(result.status, "REQUIRES_CONFIRMATION");
  });

  test("every requirement CONFIRMED or NOT_APPLICABLE is ELIGIBLE", () => {
    const checklist: Record<string, "CONFIRMED" | "NOT_APPLICABLE"> = {};
    for (const req of [
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
    ]) {
      checklist[req] = "CONFIRMED";
    }
    const result = computeEligibilityStatus(checklist);
    assert.equal(result.status, "ELIGIBLE");
  });
});

describe("isRecommended", () => {
  const base = {
    eligibilityStatus: "ELIGIBLE" as const,
    sourceUrl: "https://example.org/grant",
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    rollingDeadline: false,
    totalScore: 80,
    threshold: 70,
  };

  test("eligible, sourced, future deadline, above threshold is recommended", () => {
    assert.equal(isRecommended(base), true);
  });

  test("NOT_ELIGIBLE is never recommended even with a perfect score", () => {
    assert.equal(isRecommended({ ...base, eligibilityStatus: "NOT_ELIGIBLE", totalScore: 100 }), false);
  });

  test("no source URL is never recommended", () => {
    assert.equal(isRecommended({ ...base, sourceUrl: null }), false);
  });

  test("below threshold is not recommended", () => {
    assert.equal(isRecommended({ ...base, totalScore: 69, threshold: 70 }), false);
  });

  test("expired non-rolling deadline is not recommended", () => {
    assert.equal(isRecommended({ ...base, deadline: new Date(Date.now() - 1000) }), false);
  });

  test("expired deadline is fine if rolling", () => {
    assert.equal(isRecommended({ ...base, deadline: new Date(Date.now() - 1000), rollingDeadline: true }), true);
  });
});

describe("explainFit", () => {
  test("never returns only a number — always includes strengths/concerns arrays", () => {
    const result = explainFit(
      { educationScore: 20, nigeriaAfricaScore: 20, educationAccessScore: 15, digitalLearningScore: 15, aiTechScore: 10, youthScore: 10, fundingPotentialScore: 5, timingScore: 5 },
      "ELIGIBLE",
      [],
      null,
      false
    );
    assert.ok(Array.isArray(result.strengths));
    assert.ok(Array.isArray(result.concerns));
    assert.ok(result.strengths.length > 0);
  });

  test("surfaces eligibility reasons as concerns when not fully eligible", () => {
    const result = explainFit(
      { educationScore: 0, nigeriaAfricaScore: 0, educationAccessScore: 0, digitalLearningScore: 0, aiTechScore: 0, youthScore: 0, fundingPotentialScore: 0, timingScore: 0 },
      "REQUIRES_CONFIRMATION",
      ["Country eligibility: needs confirmation"],
      null,
      false
    );
    assert.ok(result.concerns.includes("Country eligibility: needs confirmation"));
  });
});

describe("computeFunderFitScore", () => {
  test("a funder with no matching focus scores low", () => {
    const score = computeFunderFitScore({
      educationFocus: false,
      africaFocus: false,
      nigeriaFocus: false,
      technologyFocus: false,
      youthFocus: false,
    });
    assert.equal(score, 0);
  });

  test("a fully-aligned, eligibility-compatible funder scores high", () => {
    const score = computeFunderFitScore({
      educationFocus: true,
      africaFocus: true,
      nigeriaFocus: true,
      technologyFocus: true,
      youthFocus: true,
      permitsFiscalSponsorship: true,
      typicalMinGrantMinor: 100000,
    });
    assert.equal(score, 100);
  });
});

describe("computeDiscoveryConfidence", () => {
  test("a complete, recently-checked, sourced discovery is HIGH confidence", () => {
    const checklist: Record<string, string> = {};
    for (let i = 0; i < 12; i++) checklist[`item${i}`] = "CONFIRMED";
    const confidence = computeDiscoveryConfidence({
      sourceUrl: "https://example.org",
      verificationChecklist: checklist,
      deadline: new Date(),
      rollingDeadline: false,
      minimumAwardMinor: 10000,
      maximumAwardMinor: 50000,
      lastCheckedAt: new Date(),
    });
    assert.equal(confidence, "HIGH");
  });

  test("a bare discovery with nothing confirmed is LOW confidence", () => {
    const confidence = computeDiscoveryConfidence({
      sourceUrl: null,
      verificationChecklist: null,
      deadline: null,
      rollingDeadline: false,
      minimumAwardMinor: null,
      maximumAwardMinor: null,
      lastCheckedAt: null,
    });
    assert.equal(confidence, "LOW");
  });

  test("confidence never depends on score", () => {
    // Just documents the contract — no score field is accepted at all.
    const confidence = computeDiscoveryConfidence({
      sourceUrl: "https://example.org",
      verificationChecklist: null,
      deadline: null,
      rollingDeadline: false,
      minimumAwardMinor: null,
      maximumAwardMinor: null,
      lastCheckedAt: null,
    });
    assert.ok(["HIGH", "MEDIUM", "LOW"].includes(confidence));
  });
});

describe("computeReadinessScore", () => {
  test("no items is 0%", () => {
    assert.deepEqual(computeReadinessScore([]), { percent: 0, missing: [] });
  });

  test("computes percent available and lists missing labels", () => {
    const result = computeReadinessScore([
      { label: "Budget", status: "AVAILABLE" },
      { label: "Safeguarding policy", status: "MISSING" },
      { label: "Financial statement", status: "DRAFT" },
      { label: "Concept note", status: "AVAILABLE" },
    ]);
    assert.equal(result.percent, 50);
    assert.deepEqual(result.missing, ["Safeguarding policy", "Financial statement"]);
  });
});

describe("isStale", () => {
  test("null lastVerifiedAt is always stale", () => {
    assert.equal(isStale(null, 90), true);
  });

  test("verified today is not stale against a 90-day threshold", () => {
    assert.equal(isStale(new Date(), 90), false);
  });

  test("verified 100 days ago is stale against a 90-day threshold", () => {
    const date = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    assert.equal(isStale(date, 90), true);
  });
});

describe("deadlineUrgency", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  test("null deadline has no urgency", () => {
    assert.equal(deadlineUrgency(null, now), null);
  });

  test("a past deadline is OVERDUE", () => {
    assert.equal(deadlineUrgency(new Date("2025-12-31T00:00:00Z"), now), "OVERDUE");
  });

  test("within 48 hours", () => {
    assert.equal(deadlineUrgency(new Date("2026-01-02T00:00:00Z"), now), "48_HOURS");
  });

  test("within 7 days", () => {
    assert.equal(deadlineUrgency(new Date("2026-01-06T00:00:00Z"), now), "7_DAYS");
  });

  test("within 14 days", () => {
    assert.equal(deadlineUrgency(new Date("2026-01-13T00:00:00Z"), now), "14_DAYS");
  });

  test("within 30 days", () => {
    assert.equal(deadlineUrgency(new Date("2026-01-25T00:00:00Z"), now), "30_DAYS");
  });

  test("more than 30 days away has no urgency badge", () => {
    assert.equal(deadlineUrgency(new Date("2026-06-01T00:00:00Z"), now), null);
  });
});
