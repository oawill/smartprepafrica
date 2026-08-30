// Pure unit tests for the admin Permission matrix (src/lib/admin/permissions.ts).
// No database needed — hasPermission/permissionsFor are deterministic
// lookups against ROLE_PERMISSIONS.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, permissionsFor, ROLE_PERMISSIONS } from "../../src/lib/admin/permissions";
import type { AdminRole } from "@prisma/client";

describe("hasPermission / permissionsFor", () => {
  test("a user with no adminRole (null/undefined) has zero permissions", () => {
    assert.equal(permissionsFor(null).length, 0);
    assert.equal(permissionsFor(undefined).length, 0);
    assert.equal(hasPermission(null, "partners.approve"), false);
  });

  test("every AdminRole in the enum has an explicit entry in ROLE_PERMISSIONS", () => {
    const roles: AdminRole[] = [
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "CONTENT_ADMIN",
      "CONTENT_REVIEWER",
      "SCHOOL_SUPPORT_ADMIN",
      "USER_SUPPORT_ADMIN",
      "FINANCE_ADMIN",
      "PARTNER_ADMIN",
      "SECURITY_ADMIN",
      "ANALYST",
    ];
    for (const role of roles) {
      assert.ok(Array.isArray(ROLE_PERMISSIONS[role]), `${role} must have a permission list`);
    }
  });

  test("SUPER_ADMIN has every permission", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as AdminRole[]) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        assert.equal(
          hasPermission("SUPER_ADMIN", permission),
          true,
          `SUPER_ADMIN should have ${permission} (granted to ${role})`
        );
      }
    }
  });

  // Matches this session's fix in commit 3d1ee12 — the exact regression
  // that motivated replacing coarse role-only checks with this matrix.
  test("ANALYST cannot approve partners, manage support, or pay out partner commissions", () => {
    assert.equal(hasPermission("ANALYST", "partners.approve"), false);
    assert.equal(hasPermission("ANALYST", "support.manage"), false);
    assert.equal(hasPermission("ANALYST", "partners.payout"), false);
  });

  test("PARTNER_ADMIN can approve/payout partners but cannot manage admins or roles", () => {
    assert.equal(hasPermission("PARTNER_ADMIN", "partners.approve"), true);
    assert.equal(hasPermission("PARTNER_ADMIN", "partners.payout"), true);
    assert.equal(hasPermission("PARTNER_ADMIN", "admins.create"), false);
    assert.equal(hasPermission("PARTNER_ADMIN", "roles.manage"), false);
  });

  test("only SUPER_ADMIN can create admins or manage roles", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as AdminRole[]) {
      const expected = role === "SUPER_ADMIN";
      assert.equal(hasPermission(role, "admins.create"), expected, `admins.create for ${role}`);
      assert.equal(hasPermission(role, "roles.manage"), expected, `roles.manage for ${role}`);
    }
  });

  test("USER_SUPPORT_ADMIN can suspend users but cannot approve courses or refund payments", () => {
    assert.equal(hasPermission("USER_SUPPORT_ADMIN", "users.suspend"), true);
    assert.equal(hasPermission("USER_SUPPORT_ADMIN", "courses.approve"), false);
    assert.equal(hasPermission("USER_SUPPORT_ADMIN", "payments.refund"), false);
  });
});
