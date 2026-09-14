import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeTotalScore,
  classifyOpportunity,
  computeEligibility,
  isStale,
  deadlineUrgency,
} from "../../src/lib/education-access/funding-center/scoring";

describe("computeTotalScore", () => {
  test("sums all six subscores", () => {
    const total = computeTotalScore({
      missionScore: 25,
      geographicScore: 20,
      programScore: 20,
      eligibilityScore: 20,
      fundingScore: 10,
      timingScore: 5,
    });
    assert.equal(total, 100);
  });

  test("treats missing subscores as 0, never as fully scored", () => {
    const total = computeTotalScore({
      missionScore: 25,
      geographicScore: null,
      programScore: null,
      eligibilityScore: null,
      fundingScore: null,
      timingScore: null,
    });
    assert.equal(total, 25);
  });

  test("an entirely unscored opportunity totals 0", () => {
    const total = computeTotalScore({
      missionScore: null,
      geographicScore: null,
      programScore: null,
      eligibilityScore: null,
      fundingScore: null,
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

describe("computeEligibility", () => {
  test("no checklist at all is eligible (nothing disqualified yet)", () => {
    assert.equal(computeEligibility(null).eligible, true);
    assert.equal(computeEligibility(undefined).eligible, true);
  });

  test("all CONFIRMED is eligible", () => {
    const result = computeEligibility({ "Organization type accepted": "CONFIRMED", "Country eligibility": "CONFIRMED" });
    assert.equal(result.eligible, true);
  });

  test("a single DISQUALIFIED item makes the whole opportunity ineligible", () => {
    const result = computeEligibility({
      "Organization type accepted": "CONFIRMED",
      "Nonprofit requirement": "DISQUALIFIED",
    });
    assert.equal(result.eligible, false);
    assert.deepEqual(result.disqualifyingItems, ["Nonprofit requirement"]);
  });

  test("a high score cannot override a DISQUALIFIED checklist item — eligibility is checklist-only", () => {
    // This test documents the contract: computeEligibility never looks at
    // score at all, so nothing can accidentally wire a high score into
    // bypassing a disqualification.
    const result = computeEligibility({ "Tax-exempt requirement": "DISQUALIFIED" });
    assert.equal(result.eligible, false);
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
