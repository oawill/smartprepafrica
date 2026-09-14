import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeProfileCompletion } from "../../src/lib/profile/completion";

const EMPTY = {
  gradeLevel: null,
  academicTrack: null,
  subjectCount: 0,
  targetExamCount: 0,
  studyGoal: null,
  dailyStudyMinutes: null,
  studyDayCount: 0,
};

describe("computeProfileCompletion", () => {
  test("fully empty profile is 0%, missing all six", () => {
    const result = computeProfileCompletion(EMPTY);
    assert.equal(result.pct, 0);
    assert.equal(result.missing.length, 6);
  });

  test("fully complete profile is 100%, missing nothing", () => {
    const result = computeProfileCompletion({
      gradeLevel: "SS2",
      academicTrack: "SCIENCE",
      subjectCount: 5,
      targetExamCount: 1,
      studyGoal: "Pass my exams",
      dailyStudyMinutes: 60,
      studyDayCount: 3,
    });
    assert.equal(result.pct, 100);
    assert.deepEqual(result.missing, []);
  });

  test("availability requires both minutes and at least one day", () => {
    const missingDays = computeProfileCompletion({ ...EMPTY, dailyStudyMinutes: 60, studyDayCount: 0 });
    assert.ok(missingDays.missing.includes("Study availability"));

    const missingMinutes = computeProfileCompletion({ ...EMPTY, dailyStudyMinutes: null, studyDayCount: 3 });
    assert.ok(missingMinutes.missing.includes("Study availability"));
  });

  test("partial completion rounds to the nearest whole percent", () => {
    const result = computeProfileCompletion({ ...EMPTY, gradeLevel: "SS2", academicTrack: "SCIENCE" });
    assert.equal(result.pct, 33); // 2/6
  });
});
