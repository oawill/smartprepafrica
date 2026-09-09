import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { PLAN_PRICING_KOBO, annualSavingsKobo, formatNaira, resolvePlanPrice } from "../../src/lib/plans";
import { prisma, uniqueSuffix } from "../helpers/fixtures";

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

describe("resolvePlanPrice currency fallback (DB-backed)", () => {
  const countryIds: string[] = [];

  after(async () => {
    await prisma.countryPlanPrice.deleteMany({ where: { countryId: { in: countryIds } } });
    await prisma.country.deleteMany({ where: { id: { in: countryIds } } });
  });

  async function makeTestCountry() {
    const suffix = uniqueSuffix();
    const country = await prisma.country.create({
      data: {
        name: `Test Country ${suffix}`,
        code: suffix.slice(-6).toUpperCase(), // unlikely to collide with a real 2-letter ISO code
        currency: "GHS",
        currencySymbol: "₵",
        flag: "🏳️",
        timezone: "Africa/Accra",
      },
    });
    countryIds.push(country.id);
    return country;
  }

  test("no country falls back to the hardcoded Nigeria default", async () => {
    const price = await resolvePlanPrice("BASIC", null);
    assert.deepEqual(price, { amountMinor: 250_000, currency: "NGN" });
  });

  test("Nigeria with no override falls back to the hardcoded default", async () => {
    const nigeria = await prisma.country.findUniqueOrThrow({ where: { code: "NG" } });
    const price = await resolvePlanPrice("PRO", nigeria.id);
    assert.deepEqual(price, { amountMinor: 650_000, currency: "NGN" });
  });

  test("a non-Nigeria country with no override returns null, not a mislabeled NGN quote", async () => {
    const country = await makeTestCountry();
    const price = await resolvePlanPrice("BASIC", country.id);
    assert.equal(price, null);
  });

  test("a non-Nigeria country with an explicit override uses it", async () => {
    const country = await makeTestCountry();
    await prisma.countryPlanPrice.create({
      data: { countryId: country.id, plan: "BASIC", priceMinor: 12_000, currency: "GHS" },
    });

    const price = await resolvePlanPrice("BASIC", country.id);
    assert.deepEqual(price, { amountMinor: 12_000, currency: "GHS" });
  });
});
