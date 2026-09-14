import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveSubjectIds,
  allocateWeeklyMinutes,
  distributeAcrossDays,
  selectTopicsForSlot,
  examProximityBucket,
  round5,
  type SubjectAllocationInput,
  type MasteryRow,
} from "../../src/lib/study-plan/scheduler";

function sumMap(m: Map<string, number>): number {
  return [...m.values()].reduce((a, b) => a + b, 0);
}

const NOW = new Date(2026, 8, 14); // Monday, Sept 14 2026

function row(overrides: Partial<MasteryRow>): MasteryRow {
  return {
    subjectId: "s",
    topic: "Topic",
    masteryScore: 50,
    confidenceScore: 0.5,
    lastPracticedAt: NOW,
    ...overrides,
  };
}

describe("resolveSubjectIds", () => {
  test("prefers targetSubjects when present", () => {
    const result = resolveSubjectIds({
      targetSubjectIds: ["a", "b"],
      examProfileSubjectIds: ["c"],
      weakSubjectIds: ["d"],
    });
    assert.deepEqual(result, ["a", "b"]);
  });

  test("falls back to exam profile subjects, then weak subjects, then empty", () => {
    assert.deepEqual(
      resolveSubjectIds({ targetSubjectIds: [], examProfileSubjectIds: ["c"], weakSubjectIds: ["d"] }),
      ["c"]
    );
    assert.deepEqual(
      resolveSubjectIds({ targetSubjectIds: [], examProfileSubjectIds: [], weakSubjectIds: ["d"] }),
      ["d"]
    );
    assert.deepEqual(resolveSubjectIds({ targetSubjectIds: [], examProfileSubjectIds: [], weakSubjectIds: [] }), []);
  });
});

describe("allocateWeeklyMinutes", () => {
  test("weekly total never exceeds the student's budget", () => {
    const subjects: SubjectAllocationInput[] = [
      { subjectId: "chem", isWeakSubject: true, topics: [row({ subjectId: "chem", masteryScore: 30, confidenceScore: 0.8 })] },
      { subjectId: "math", isWeakSubject: false, topics: [row({ subjectId: "math", masteryScore: 88, confidenceScore: 0.9 })] },
      { subjectId: "eng", isWeakSubject: false, topics: [row({ subjectId: "eng", masteryScore: 60, confidenceScore: 0.6 })] },
    ];
    const result = allocateWeeklyMinutes(subjects, [], 420, NOW); // 2h/day * 3.5... use 420 = 60min*7days-ish
    assert.equal(sumMap(result), 420);
  });

  test("a weak subject gets strictly more minutes than a strong one, all else equal", () => {
    const subjects: SubjectAllocationInput[] = [
      { subjectId: "weak", isWeakSubject: true, topics: [row({ subjectId: "weak", masteryScore: 25, confidenceScore: 0.9 })] },
      { subjectId: "strong", isWeakSubject: false, topics: [row({ subjectId: "strong", masteryScore: 92, confidenceScore: 0.9 })] },
    ];
    const result = allocateWeeklyMinutes(subjects, [], 420, NOW);
    assert.ok((result.get("weak") ?? 0) > (result.get("strong") ?? 0));
  });

  test("no subject is starved to zero even when far weaker than others", () => {
    const subjects: SubjectAllocationInput[] = [
      { subjectId: "veryweak", isWeakSubject: true, topics: [row({ subjectId: "veryweak", masteryScore: 10, confidenceScore: 0.9 })] },
      { subjectId: "a", isWeakSubject: false, topics: [row({ subjectId: "a", masteryScore: 95, confidenceScore: 0.9 })] },
      { subjectId: "b", isWeakSubject: false, topics: [row({ subjectId: "b", masteryScore: 95, confidenceScore: 0.9 })] },
    ];
    const result = allocateWeeklyMinutes(subjects, [], 300, NOW);
    for (const id of ["veryweak", "a", "b"]) {
      assert.ok((result.get(id) ?? 0) > 0, `${id} should get a nonzero share`);
    }
  });

  test("empty subjects or zero budget produce an empty allocation", () => {
    assert.equal(sumMap(allocateWeeklyMinutes([], [], 300, NOW)), 0);
    assert.equal(
      sumMap(allocateWeeklyMinutes([{ subjectId: "a", isWeakSubject: false, topics: [] }], [], 0, NOW)),
      0
    );
  });

  test("a subject tied to an imminent exam date outranks one with no exam date", () => {
    const subjects: SubjectAllocationInput[] = [
      { subjectId: "urgent", isWeakSubject: false, topics: [row({ subjectId: "urgent", masteryScore: 70, confidenceScore: 0.9 })] },
      { subjectId: "distant", isWeakSubject: false, topics: [row({ subjectId: "distant", masteryScore: 70, confidenceScore: 0.9 })] },
    ];
    const soon = new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000);
    const result = allocateWeeklyMinutes(
      subjects,
      [{ subjectIds: ["urgent"], examDate: soon }],
      300,
      NOW
    );
    assert.ok((result.get("urgent") ?? 0) > (result.get("distant") ?? 0));
  });
});

describe("distributeAcrossDays", () => {
  const weekStart = new Date(2026, 8, 14); // Monday

  test("never exceeds dailyStudyMinutes on any single day", () => {
    const allocations = new Map([
      ["a", 300],
      ["b", 300],
    ]);
    const slots = distributeAcrossDays(allocations, ["MONDAY", "WEDNESDAY", "FRIDAY"], 120, weekStart);
    const byDay = new Map<string, number>();
    for (const s of slots) {
      const key = s.date.toDateString();
      byDay.set(key, (byDay.get(key) ?? 0) + s.minutes);
    }
    for (const total of byDay.values()) {
      assert.ok(total <= 120, `day total ${total} should not exceed 120`);
    }
  });

  test("total distributed never exceeds the sum of allocations", () => {
    const allocations = new Map([["a", 90]]);
    const slots = distributeAcrossDays(allocations, ["MONDAY", "TUESDAY"], 60, weekStart);
    const total = slots.reduce((sum, s) => sum + s.minutes, 0);
    assert.ok(total <= 90);
  });

  test("empty study days or zero daily minutes produce no slots", () => {
    assert.deepEqual(distributeAcrossDays(new Map([["a", 100]]), [], 60, weekStart), []);
    assert.deepEqual(distributeAcrossDays(new Map([["a", 100]]), ["MONDAY"], 0, weekStart), []);
  });

  test("fromDate restricts output to that day and later", () => {
    const allocations = new Map([["a", 200]]);
    const wednesday = new Date(2026, 8, 16);
    const slots = distributeAcrossDays(allocations, ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"], 60, weekStart, {
      fromDate: wednesday,
    });
    assert.ok(slots.every((s) => s.date >= wednesday));
  });
});

describe("examProximityBucket", () => {
  test("buckets days-to-exam correctly", () => {
    assert.equal(examProximityBucket(null), "FAR");
    assert.equal(examProximityBucket(90), "FAR");
    assert.equal(examProximityBucket(45), "MID");
    assert.equal(examProximityBucket(20), "NEAR");
    assert.equal(examProximityBucket(10), "CLOSE");
    assert.equal(examProximityBucket(3), "IMMINENT");
  });
});

describe("selectTopicsForSlot", () => {
  const drillConfig = { topicDrillSize: 10, practiceSessionSize: 20, challengeSize: 40 };

  test("prioritizes the weakest topic first (Trigonometry over Algebra/Geometry example)", () => {
    const topics: MasteryRow[] = [
      row({ topic: "Algebra", masteryScore: 84, confidenceScore: 0.9, lastPracticedAt: NOW }),
      row({ topic: "Geometry", masteryScore: 78, confidenceScore: 0.9, lastPracticedAt: NOW }),
      row({ topic: "Trigonometry", masteryScore: 42, confidenceScore: 0.9, lastPracticedAt: NOW }),
    ];
    const result = selectTopicsForSlot({
      subjectId: "math",
      minutes: 30,
      topics,
      coldStartTopics: [],
      isColdStartFinalDay: false,
      daysToExam: null,
      drillConfig,
      now: NOW,
    });
    assert.equal(result[0].topic, "Trigonometry");
  });

  test("cold start with lesson content produces lessons, seeding one drill on the final day", () => {
    const result = selectTopicsForSlot({
      subjectId: "chem",
      minutes: 60,
      topics: [],
      coldStartTopics: ["Atoms", "Bonding", "Reactions"],
      isColdStartFinalDay: true,
      daysToExam: null,
      drillConfig,
      now: NOW,
    });
    assert.ok(result.some((r) => r.activityType === "PRACTICE_DRILL"));
    assert.ok(result.some((r) => r.activityType === "LESSON"));
  });

  test("cold start with zero lesson content falls back to an AI coach session, never a dead link", () => {
    const result = selectTopicsForSlot({
      subjectId: "chem",
      minutes: 30,
      topics: [],
      coldStartTopics: [],
      isColdStartFinalDay: false,
      daysToExam: null,
      drillConfig,
      now: NOW,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].activityType, "AI_COACH_SESSION");
  });

  test("stays within the minute budget", () => {
    const topics: MasteryRow[] = [
      row({ topic: "A", masteryScore: 20, confidenceScore: 0.9 }),
      row({ topic: "B", masteryScore: 30, confidenceScore: 0.9 }),
      row({ topic: "C", masteryScore: 40, confidenceScore: 0.9 }),
    ];
    const result = selectTopicsForSlot({
      subjectId: "s",
      minutes: 45,
      topics,
      coldStartTopics: [],
      isColdStartFinalDay: false,
      daysToExam: null,
      drillConfig,
      now: NOW,
    });
    const total = result.reduce((sum, r) => sum + r.minutes, 0);
    assert.ok(total <= 45);
  });

  test("exam-proximity ramp shifts weak topics toward review/mock as the exam nears", () => {
    const topics: MasteryRow[] = [row({ topic: "Weak Topic", masteryScore: 30, confidenceScore: 0.9 })];
    const far = selectTopicsForSlot({
      subjectId: "s",
      minutes: 30,
      topics,
      coldStartTopics: [],
      isColdStartFinalDay: false,
      daysToExam: 90,
      drillConfig,
      now: NOW,
    });
    const imminent = selectTopicsForSlot({
      subjectId: "s",
      minutes: 30,
      topics,
      coldStartTopics: [],
      isColdStartFinalDay: false,
      daysToExam: 3,
      drillConfig,
      now: NOW,
    });
    assert.equal(far[0].activityType, "PRACTICE_DRILL");
    assert.ok(["REVIEW_MISTAKES", "MOCK_EXAM"].includes(imminent[0].activityType));
  });
});

describe("round5", () => {
  test("rounds to the nearest 5 and never goes negative", () => {
    assert.equal(round5(23), 25);
    assert.equal(round5(22), 20);
    assert.equal(round5(-4), 0);
  });
});
