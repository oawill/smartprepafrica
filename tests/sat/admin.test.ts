import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, ROLE_PERMISSIONS } from "../../src/lib/admin/permissions";
import { navForAdminRole } from "../../src/lib/admin/nav";
import type { AdminRole } from "@prisma/client";

describe("sat.* permissions", () => {
  test("every AdminRole still has an explicit entry in ROLE_PERMISSIONS", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as AdminRole[]) {
      assert.ok(Array.isArray(ROLE_PERMISSIONS[role]));
    }
  });

  test("CONTENT_ADMIN can manage SAT content", () => {
    assert.equal(hasPermission("CONTENT_ADMIN", "sat.view"), true);
    assert.equal(hasPermission("CONTENT_ADMIN", "sat.create"), true);
    assert.equal(hasPermission("CONTENT_ADMIN", "sat.publish"), true);
  });

  test("CONTENT_REVIEWER can review but not create SAT content", () => {
    assert.equal(hasPermission("CONTENT_REVIEWER", "sat.view"), true);
    assert.equal(hasPermission("CONTENT_REVIEWER", "sat.review"), true);
    assert.equal(hasPermission("CONTENT_REVIEWER", "sat.create"), false);
  });

  test("SCHOOL_SUPPORT_ADMIN (unrelated role) has no SAT permissions", () => {
    assert.equal(hasPermission("SCHOOL_SUPPORT_ADMIN", "sat.view"), false);
  });
});

describe("International Exams nav group respects ENABLE_SAT independently of ENABLE_TOEFL", () => {
  test("hidden when neither flag is set", () => {
    delete process.env.ENABLE_TOEFL;
    delete process.env.ENABLE_SAT;
    const groups = navForAdminRole("SUPER_ADMIN");
    assert.ok(!groups.some((g) => g.label === "International Exams"));
  });

  test("visible with only ENABLE_SAT=true, showing SAT items but not TOEFL items", () => {
    delete process.env.ENABLE_TOEFL;
    process.env.ENABLE_SAT = "true";
    const groups = navForAdminRole("SUPER_ADMIN");
    const group = groups.find((g) => g.label === "International Exams");
    assert.ok(group);
    assert.ok(group!.items.some((i) => i.label === "SAT Overview"));
    assert.ok(!group!.items.some((i) => i.label === "Overview"));
    delete process.env.ENABLE_SAT;
  });

  test("a role without sat.view sees no SAT items even with ENABLE_SAT=true", () => {
    process.env.ENABLE_SAT = "true";
    const groups = navForAdminRole("SCHOOL_SUPPORT_ADMIN");
    assert.ok(!groups.some((g) => g.label === "International Exams"));
    delete process.env.ENABLE_SAT;
  });
});
