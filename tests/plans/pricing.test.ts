import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PLAN_PRICING_KOBO, annualSavingsKobo, formatNaira } from "../../src/lib/plans";

describe("Subscription plan pricing", () => {
  test("Premium is ₦4,500/month and ₦43,200/year", () => {
    assert.equal(PLAN_PRICING_KOBO.PREMIUM?.monthly, 450_000);
    assert.equal(PLAN_PRICING_KOBO.PREMIUM?.annual, 4_320_000);
    assert.equal(formatNaira(450_000), "₦4,500");
    assert.equal(formatNaira(4_320_000), "₦43,200");
  });

  test("Pro is ₦6,500/month and ₦62,400/year", () => {
    assert.equal(PLAN_PRICING_KOBO.PRO?.monthly, 650_000);
    assert.equal(PLAN_PRICING_KOBO.PRO?.annual, 6_240_000);
  });

  test("Basic remains monthly-only, at ₦2,500/month", () => {
    assert.equal(PLAN_PRICING_KOBO.BASIC?.monthly, 250_000);
    assert.equal(PLAN_PRICING_KOBO.BASIC?.annual, undefined);
  });

  test("Premium annual saves ₦10,800/year over paying monthly", () => {
    assert.equal(annualSavingsKobo("PREMIUM"), 1_080_000);
    assert.equal(formatNaira(1_080_000), "₦10,800");
  });

  test("Pro annual saves ₦15,600/year over paying monthly", () => {
    assert.equal(annualSavingsKobo("PRO"), 1_560_000);
    assert.equal(formatNaira(1_560_000), "₦15,600");
  });

  test("annualSavingsKobo returns null for a plan with no annual price", () => {
    assert.equal(annualSavingsKobo("BASIC"), null);
    assert.equal(annualSavingsKobo("FREE"), null);
  });
});
