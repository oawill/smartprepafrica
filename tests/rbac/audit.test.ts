// 7. Admin: Authorized admin actions succeed and are audited.
// logAudit (src/lib/admin/audit.ts) is the exact function every admin
// Server Action calls on both success and permission-denial — this checks
// it actually persists a row with the fields the audit-log viewer relies on.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { logAudit } from "../../src/lib/admin/audit";
import { prisma, createUser, deleteUsers } from "../helpers/fixtures";

const userIds: string[] = [];
const auditLogIds: string[] = [];

after(async () => {
  await prisma.auditLog.deleteMany({ where: { id: { in: auditLogIds } } });
  await deleteUsers(userIds);
  await prisma.$disconnect();
});

describe("logAudit", () => {
  test("a successful admin action is recorded with actor, action, and result", async () => {
    const admin = await createUser("ADMIN", "audit-admin");
    userIds.push(admin.id);

    await logAudit({
      actorUserId: admin.id,
      actorRole: "ADMIN",
      action: "RBAC_TEST_ACTION",
      resourceType: "Subject",
      resourceId: "some-subject-id",
      result: "SUCCESS",
      after: { name: "Biology" },
    });

    const row = await prisma.auditLog.findFirst({
      where: { actorUserId: admin.id, action: "RBAC_TEST_ACTION" },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(row, "logAudit must persist a row");
    auditLogIds.push(row!.id);
    assert.equal(row!.result, "SUCCESS");
    assert.equal(row!.resourceType, "Subject");
    assert.deepEqual(row!.after, { name: "Biology" });
  });

  test("a permission denial is recorded with result DENIED — matches requireActionPermission's own call shape", async () => {
    const student = await createUser("STUDENT", "audit-denied-student");
    userIds.push(student.id);

    // Same call shape as src/lib/admin/authz.ts's requireActionPermission
    // when a non-admin (or an admin lacking the permission) is denied.
    await logAudit({
      actorUserId: student.id,
      actorRole: "STUDENT",
      action: "PERMISSION_DENIED:partners.approve",
      resourceType: "Permission",
      resourceId: "partners.approve",
      result: "DENIED",
    });

    const row = await prisma.auditLog.findFirst({
      where: { actorUserId: student.id, action: "PERMISSION_DENIED:partners.approve" },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(row);
    auditLogIds.push(row!.id);
    assert.equal(row!.result, "DENIED");
  });
});
