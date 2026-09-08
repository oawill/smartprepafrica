// Unit test for canEnrollInCourse — pure function, no DB, same convention
// as tests/plans/pricing.test.ts. Regression guard for Phase 3's
// subscription-gated course enrollment (see docs/migration-plan.md
// Phase 3+ and the Phase 3 plan): a course with requiresSubscription can
// only be enrolled in by a non-FREE plan.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canEnrollInCourse } from "../../src/lib/learning/course-access";

describe("canEnrollInCourse", () => {
  test("FREE plan cannot enroll in a subscription-required course", () => {
    assert.equal(canEnrollInCourse("FREE", true), false);
  });

  test("FREE plan CAN enroll in a course that doesn't require a subscription", () => {
    assert.equal(canEnrollInCourse("FREE", false), true);
  });

  test("BASIC plan can enroll in a subscription-required course", () => {
    assert.equal(canEnrollInCourse("BASIC", true), true);
  });

  test("PREMIUM plan can enroll in a subscription-required course", () => {
    assert.equal(canEnrollInCourse("PREMIUM", true), true);
  });

  test("PRO plan can enroll in a subscription-required course", () => {
    assert.equal(canEnrollInCourse("PRO", true), true);
  });

  test("SCHOOL plan can enroll in a subscription-required course", () => {
    assert.equal(canEnrollInCourse("SCHOOL", true), true);
  });
});
