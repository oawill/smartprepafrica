import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PLAN_PRICING_KOBO, annualSavingsKobo, formatNaira } from "../../src/lib/plans";

describe("Subscription plan pricing", () => {
  test("Premium is ₦3,500/month and ₦33,600/year", () => {
    assert.equal(PLAN_PRICING_KOBO.PREMIUM?.monthly, 350_000);
    assert.equal(PLAN_PRICING_KOBO.PREMIUM?.annual, 3_360_000);
    assert.equal(formatNaira(350_000), "₦3,500");
    assert.equal(formatNaira(3_360_000), "₦33,600");
  });

  test("Pro is ₦5,000/month and ₦48,000/year", () => {
    assert.equal(PLAN_PRICING_KOBO.PRO?.monthly, 500_000);
    assert.equal(PLAN_PRICING_KOBO.PRO?.annual, 4_800_000);
  });

  test("Basic remains monthly-only, unchanged at ₦1,500/month", () => {
    assert.equal(PLAN_PRICING_KOBO.BASIC?.monthly, 150_000);
    assert.equal(PLAN_PRICING_KOBO.BASIC?.annual, undefined);
  });

  test("Premium annual saves ₦8,400/year over paying monthly", () => {
    assert.equal(annualSavingsKobo("PREMIUM"), 840_000);
    assert.equal(formatNaira(840_000), "₦8,400");
  });

  test("annualSavingsKobo returns null for a plan with no annual price", () => {
    assert.equal(annualSavingsKobo("BASIC"), null);
    assert.equal(annualSavingsKobo("FREE"), null);
  });
});
