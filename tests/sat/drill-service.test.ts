import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { tierContentByExposure, drillSizeLabel, type Exposure } from "../../src/lib/sat/drill-service";

const now = new Date("2026-06-15T00:00:00Z");
const recent = new Date("2026-06-12T00:00:00Z"); // 3 days ago
const stale = new Date("2026-05-01T00:00:00Z"); // >7 days ago

describe("tierContentByExposure", () => {
  test("a question with no exposure record is unseen", () => {
    const pool = [{ id: "q1" }];
    const tiers = tierContentByExposure(pool, new Map(), now);
    assert.deepEqual(tiers.unseen, [{ id: "q1" }]);
    assert.equal(tiers.previouslyIncorrect.length, 0);
  });

  test("a question ever answered incorrectly is previouslyIncorrect, even if the most recent attempt was correct", () => {
    const pool = [{ id: "q1" }];
    const exposure = new Map<string, Exposure>([
      ["q1", { seenCount: 2, everIncorrect: true, mostRecentStartedAt: recent }],
    ]);
    const tiers = tierContentByExposure(pool, exposure, now);
    assert.deepEqual(tiers.previouslyIncorrect, [{ id: "q1" }]);
  });

  test("a question always answered correctly, seen more than staleDays ago, is staleCorrect", () => {
    const pool = [{ id: "q1" }];
    const exposure = new Map<string, Exposure>([
      ["q1", { seenCount: 1, everIncorrect: false, mostRecentStartedAt: stale }],
    ]);
    const tiers = tierContentByExposure(pool, exposure, now);
    assert.deepEqual(tiers.staleCorrect, [{ id: "q1" }]);
  });

  test("a question always answered correctly, seen recently, is recentCorrect", () => {
    const pool = [{ id: "q1" }];
    const exposure = new Map<string, Exposure>([
      ["q1", { seenCount: 1, everIncorrect: false, mostRecentStartedAt: recent }],
    ]);
    const tiers = tierContentByExposure(pool, exposure, now);
    assert.deepEqual(tiers.recentCorrect, [{ id: "q1" }]);
  });

  test("a mixed pool sorts every question into exactly one tier", () => {
    const pool = [{ id: "unseen" }, { id: "wrong" }, { id: "stale" }, { id: "recent" }];
    const exposure = new Map<string, Exposure>([
      ["wrong", { seenCount: 1, everIncorrect: true, mostRecentStartedAt: recent }],
      ["stale", { seenCount: 1, everIncorrect: false, mostRecentStartedAt: stale }],
      ["recent", { seenCount: 1, everIncorrect: false, mostRecentStartedAt: recent }],
    ]);
    const tiers = tierContentByExposure(pool, exposure, now);
    assert.deepEqual(tiers.unseen.map((c) => c.id), ["unseen"]);
    assert.deepEqual(tiers.previouslyIncorrect.map((c) => c.id), ["wrong"]);
    assert.deepEqual(tiers.staleCorrect.map((c) => c.id), ["stale"]);
    assert.deepEqual(tiers.recentCorrect.map((c) => c.id), ["recent"]);
  });

  test("an in-progress attempt's answered item still counts as seen (caller decides what to pass in — this just proves the tiering trusts the exposure map)", () => {
    const pool = [{ id: "q1" }];
    const exposure = new Map<string, Exposure>([
      ["q1", { seenCount: 1, everIncorrect: false, mostRecentStartedAt: recent }],
    ]);
    const tiers = tierContentByExposure(pool, exposure, now);
    assert.equal(tiers.unseen.length, 0);
  });
});

describe("drillSizeLabel", () => {
  test("maps known sizes back to their config key", () => {
    assert.equal(drillSizeLabel(5), "QUICK");
    assert.equal(drillSizeLabel(10), "FOCUS");
    assert.equal(drillSizeLabel(15), "PRACTICE_SET");
    assert.equal(drillSizeLabel(20), "CHALLENGE");
  });

  test("an unrecognized size falls back to a plain description", () => {
    assert.equal(drillSizeLabel(7), "7 questions");
  });
});
