import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { tierByExposure, interleaveByTopic, packUnitsInOrder, type Exposure } from "../../src/lib/practice/smart-selection";

const now = new Date("2026-06-15T00:00:00Z");
const recent = new Date("2026-06-12T00:00:00Z"); // 3 days ago
const stale = new Date("2026-05-01T00:00:00Z"); // >7 days ago

describe("tierByExposure", () => {
  test("a question with no exposure record is unseen", () => {
    const pool = [{ id: "q1" }];
    const tiers = tierByExposure(pool, new Map(), now);
    assert.deepEqual(tiers.unseen, [{ id: "q1" }]);
  });

  test("a question ever answered incorrectly is previouslyIncorrect", () => {
    const pool = [{ id: "q1" }];
    const exposure = new Map<string, Exposure>([["q1", { everIncorrect: true, mostRecentStartedAt: recent }]]);
    const tiers = tierByExposure(pool, exposure, now);
    assert.deepEqual(tiers.previouslyIncorrect, [{ id: "q1" }]);
  });

  test("a question always correct, seen more than 7 days ago, is staleCorrect", () => {
    const pool = [{ id: "q1" }];
    const exposure = new Map<string, Exposure>([["q1", { everIncorrect: false, mostRecentStartedAt: stale }]]);
    const tiers = tierByExposure(pool, exposure, now);
    assert.deepEqual(tiers.staleCorrect, [{ id: "q1" }]);
  });

  test("a question always correct, seen recently, is recentCorrect", () => {
    const pool = [{ id: "q1" }];
    const exposure = new Map<string, Exposure>([["q1", { everIncorrect: false, mostRecentStartedAt: recent }]]);
    const tiers = tierByExposure(pool, exposure, now);
    assert.deepEqual(tiers.recentCorrect, [{ id: "q1" }]);
  });

  test("a mixed pool sorts every question into exactly one tier", () => {
    const pool = [{ id: "unseen" }, { id: "wrong" }, { id: "stale" }, { id: "recent" }];
    const exposure = new Map<string, Exposure>([
      ["wrong", { everIncorrect: true, mostRecentStartedAt: recent }],
      ["stale", { everIncorrect: false, mostRecentStartedAt: stale }],
      ["recent", { everIncorrect: false, mostRecentStartedAt: recent }],
    ]);
    const tiers = tierByExposure(pool, exposure, now);
    assert.deepEqual(tiers.unseen.map((c) => c.id), ["unseen"]);
    assert.deepEqual(tiers.previouslyIncorrect.map((c) => c.id), ["wrong"]);
    assert.deepEqual(tiers.staleCorrect.map((c) => c.id), ["stale"]);
    assert.deepEqual(tiers.recentCorrect.map((c) => c.id), ["recent"]);
  });
});

describe("interleaveByTopic", () => {
  test("round-robins across topics, preserving each topic's internal order", () => {
    const items = [
      { id: "a1", topic: "A" },
      { id: "a2", topic: "A" },
      { id: "b1", topic: "B" },
      { id: "a3", topic: "A" },
    ];
    const result = interleaveByTopic(items).map((i) => i.id);
    assert.deepEqual(result, ["a1", "b1", "a2", "a3"]);
  });

  test("a single topic is unaffected", () => {
    const items = [
      { id: "a1", topic: "A" },
      { id: "a2", topic: "A" },
    ];
    assert.deepEqual(
      interleaveByTopic(items).map((i) => i.id),
      ["a1", "a2"]
    );
  });

  test("empty input returns empty output", () => {
    assert.deepEqual(interleaveByTopic([]), []);
  });
});

describe("packUnitsInOrder", () => {
  test("packs standalone units in the given order without reshuffling", () => {
    const units = [{ questionIds: ["a"] }, { questionIds: ["b"] }, { questionIds: ["c"] }];
    assert.deepEqual(packUnitsInOrder(units, 2), ["a", "b"]);
  });

  test("a passage-group unit that doesn't fit is skipped, not truncated", () => {
    const units = [{ questionIds: ["p1", "p2", "p3"] }, { questionIds: ["a"] }];
    assert.deepEqual(packUnitsInOrder(units, 2), ["a"]);
  });

  test("a passage-group unit that fits exactly is taken whole", () => {
    const units = [{ questionIds: ["p1", "p2"] }, { questionIds: ["a"] }];
    assert.deepEqual(packUnitsInOrder(units, 2), ["p1", "p2"]);
  });

  test("returns fewer than requested when the pool is smaller, never throws", () => {
    const units = [{ questionIds: ["a"] }];
    assert.deepEqual(packUnitsInOrder(units, 10), ["a"]);
  });
});
