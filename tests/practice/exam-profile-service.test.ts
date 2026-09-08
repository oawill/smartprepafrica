// Integration test for getCompulsorySubjectNames — real queries against the
// local dev database, same convention as tests/rbac/authz-guards.test.ts.
// Regression guard for the switch from a hardcoded `exam === "UTME"` string
// check to a CountryExamSubject.isCompulsory data lookup (see
// docs/migration-plan.md Phase 1 §3) — asserts Nigeria's exact current
// behavior didn't change.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getCompulsorySubjectNames } from "../../src/lib/practice/exam-profile-service";

describe("getCompulsorySubjectNames", () => {
  test("UTME returns exactly English Language, same as the old hardcoded behavior", async () => {
    const names = await getCompulsorySubjectNames("UTME");
    assert.deepEqual(names, ["English Language"]);
  });

  test("WAEC has no compulsory subjects, same as the old hardcoded behavior", async () => {
    const names = await getCompulsorySubjectNames("WAEC");
    assert.deepEqual(names, []);
  });

  test("NECO has no compulsory subjects, same as the old hardcoded behavior", async () => {
    const names = await getCompulsorySubjectNames("NECO");
    assert.deepEqual(names, []);
  });

  test("POST_UTME has no compulsory subjects, same as the old hardcoded behavior", async () => {
    const names = await getCompulsorySubjectNames("POST_UTME");
    assert.deepEqual(names, []);
  });
});
