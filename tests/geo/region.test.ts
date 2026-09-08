// Integration test for the Region model (src/lib/nigerian-states.ts) — real
// queries against the local dev database, same convention as
// tests/rbac/authz-guards.test.ts. Assumes scripts/seed-regions.ts has
// already been run (Region is permanent reference data, seeded once, same
// assumption other tests make about Country/ExamBody rows already existing
// — not created/torn down per test).
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getNigerianStates, getFeaturedNigerianStates } from "../../src/lib/nigerian-states";

const prisma = new PrismaClient();

after(async () => {
  await prisma.$disconnect();
});

// Must match scripts/seed-regions.ts's NIGERIA_STATES exactly — this is the
// regression guard for the Region migration (previously a hardcoded array
// in src/lib/nigerian-states.ts).
const EXPECTED_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
].sort();

describe("getNigerianStates", () => {
  test("returns exactly the same 37 states as the old hardcoded NIGERIAN_STATES array", async () => {
    const states = await getNigerianStates();
    assert.deepEqual([...states].sort(), EXPECTED_STATES);
  });
});

describe("getFeaturedNigerianStates", () => {
  test("returns exactly the homepage's previously-hardcoded 6-state discoveryStates list", async () => {
    const featured = await getFeaturedNigerianStates();
    assert.deepEqual(
      [...featured].sort(),
      ["Enugu", "FCT", "Kano", "Lagos", "Oyo", "Rivers"]
    );
  });

  test("every featured state is also a member of the full state list (no drift)", async () => {
    const [all, featured] = await Promise.all([getNigerianStates(), getFeaturedNigerianStates()]);
    const allSet = new Set(all);
    for (const state of featured) {
      assert.ok(allSet.has(state), `featured state "${state}" is missing from the full Region list`);
    }
  });
});

describe("School.state drift check", () => {
  test("every distinct School.state value in the database matches a real Region name for Nigeria", async () => {
    const schools = await prisma.school.findMany({ select: { state: true } });
    const distinctStates = [...new Set(schools.map((s) => s.state).filter((s): s is string => !!s))];
    const validStates = new Set(await getNigerianStates());
    const drift = distinctStates.filter((s) => !validStates.has(s));
    assert.deepEqual(drift, [], `School.state values with no matching Region: ${drift.join(", ")}`);
  });
});
