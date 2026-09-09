import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { createStudentAccount } from "../../src/lib/registration/create-student-account";
import { prisma, uniqueSuffix } from "../helpers/fixtures";

describe("createStudentAccount (DB-backed)", () => {
  const userIds: string[] = [];

  after(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  test("creates a User, UserRole, and StudentProfile with a password and no phone", async () => {
    const suffix = uniqueSuffix();
    const user = await prisma.$transaction((tx) =>
      createStudentAccount(tx, {
        name: "Test Student",
        email: `create-student-${suffix}@example.invalid`,
        passwordHash: "test-hash-not-used-for-login",
        ipHash: null,
        userAgent: null,
      })
    );
    userIds.push(user.id);

    assert.equal(user.role, "STUDENT");
    assert.equal(user.phone, null);
    assert.equal(user.passwordHash, "test-hash-not-used-for-login");

    const role = await prisma.userRole.findUnique({ where: { userId_role: { userId: user.id, role: "STUDENT" } } });
    assert.ok(role);

    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    assert.ok(profile);
  });

  test("creates a phone-only account with no passwordHash", async () => {
    const suffix = uniqueSuffix();
    const phone = `+1555${suffix.replace(/\D/g, "").slice(0, 7).padEnd(7, "0")}`;
    const user = await prisma.$transaction((tx) =>
      createStudentAccount(tx, {
        name: "Phone Student",
        email: `create-student-phone-${suffix}@example.invalid`,
        phone,
        ipHash: null,
        userAgent: null,
      })
    );
    userIds.push(user.id);

    assert.equal(user.phone, phone);
    assert.equal(user.passwordHash, null);
  });

  test("records ToS and Privacy acceptance for the new account", async () => {
    const suffix = uniqueSuffix();
    const user = await prisma.$transaction((tx) =>
      createStudentAccount(tx, {
        name: "Test Student",
        email: `create-student-tos-${suffix}@example.invalid`,
        passwordHash: "test-hash-not-used-for-login",
        ipHash: null,
        userAgent: null,
      })
    );
    userIds.push(user.id);

    const acceptances = await prisma.legalAcceptance.findMany({
      where: { userId: user.id },
      include: { document: true },
    });
    const acceptedTypes = acceptances.map((a) => a.document.type).sort();
    assert.deepEqual(acceptedTypes, ["PRIVACY", "TERMS"]);
  });
});
