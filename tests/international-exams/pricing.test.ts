import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  INTERNATIONAL_EXAM_PRICING_KOBO,
  formatInternationalExamPrice,
} from "../../src/lib/international-exams/pricing";

describe("International exam pricing", () => {
  test("TOEFL is priced at ₦30,000", () => {
    assert.equal(INTERNATIONAL_EXAM_PRICING_KOBO.TOEFL, 3_000_000);
    assert.equal(formatInternationalExamPrice("TOEFL"), "₦30,000");
  });

  test("SAT is priced at ₦40,000", () => {
    assert.equal(INTERNATIONAL_EXAM_PRICING_KOBO.SAT, 4_000_000);
    assert.equal(formatInternationalExamPrice("SAT"), "₦40,000");
  });

  test("prices are distinct from the existing ₦3,500 Premium subscription price", () => {
    // 350_000 kobo is PLAN_PRICING_KOBO.PREMIUM in src/lib/plans.ts — this
    // test guards against the two pricing systems ever being conflated.
    assert.notEqual(INTERNATIONAL_EXAM_PRICING_KOBO.TOEFL, 350_000);
    assert.notEqual(INTERNATIONAL_EXAM_PRICING_KOBO.SAT, 350_000);
  });
});
