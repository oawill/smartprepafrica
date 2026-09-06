import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isToeflEnabled, TOEFL_CONFIG } from "../../src/lib/toefl/config";
import { hasPermission, ROLE_PERMISSIONS } from "../../src/lib/admin/permissions";
import { navForAdminRole } from "../../src/lib/admin/nav";
import type { AdminRole } from "@prisma/client";

describe("isToeflEnabled", () => {
  test("is false when ENABLE_TOEFL is unset", () => {
    delete process.env.ENABLE_TOEFL;
    assert.equal(isToeflEnabled(), false);
  });

  test("is false for any value other than the literal string 'true'", () => {
    process.env.ENABLE_TOEFL = "1";
    assert.equal(isToeflEnabled(), false);
    process.env.ENABLE_TOEFL = "false";
    assert.equal(isToeflEnabled(), false);
  });

  test("is true only when ENABLE_TOEFL is exactly 'true'", () => {
    process.env.ENABLE_TOEFL = "true";
    assert.equal(isToeflEnabled(), true);
    delete process.env.ENABLE_TOEFL;
  });
});

describe("TOEFL_CONFIG", () => {
  test("score scale is 0-6", () => {
    assert.equal(TOEFL_CONFIG.scoreScale.min, 0);
    assert.equal(TOEFL_CONFIG.scoreScale.max, 6);
  });

  test("covers exactly the four TOEFL skills", () => {
    assert.deepEqual(TOEFL_CONFIG.skills, ["READING", "LISTENING", "SPEAKING", "WRITING"]);
  });
});

describe("toefl.* permissions", () => {
  test("every AdminRole still has an explicit entry in ROLE_PERMISSIONS", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as AdminRole[]) {
      assert.ok(Array.isArray(ROLE_PERMISSIONS[role]));
    }
  });

  test("CONTENT_ADMIN can manage TOEFL content", () => {
    assert.equal(hasPermission("CONTENT_ADMIN", "toefl.view"), true);
    assert.equal(hasPermission("CONTENT_ADMIN", "toefl.create"), true);
    assert.equal(hasPermission("CONTENT_ADMIN", "toefl.publish"), true);
  });

  test("SCHOOL_SUPPORT_ADMIN (unrelated role) has no TOEFL permissions", () => {
    assert.equal(hasPermission("SCHOOL_SUPPORT_ADMIN", "toefl.view"), false);
  });
});

describe("International Exams nav group respects the feature flag", () => {
  test("hidden entirely when ENABLE_TOEFL is not 'true', even for SUPER_ADMIN", () => {
    delete process.env.ENABLE_TOEFL;
    const groups = navForAdminRole("SUPER_ADMIN");
    assert.ok(!groups.some((g) => g.label === "International Exams"));
  });

  test("visible for a role with toefl.view once ENABLE_TOEFL=true", () => {
    process.env.ENABLE_TOEFL = "true";
    const groups = navForAdminRole("SUPER_ADMIN");
    assert.ok(groups.some((g) => g.label === "International Exams"));
    delete process.env.ENABLE_TOEFL;
  });
});
