import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import {
  generateJoinCode,
  generateJoinPin,
  resolveSchoolByJoinCode,
} from "../../src/lib/registration/school-join-code";
import { createStudentAccount } from "../../src/lib/registration/create-student-account";
import { prisma, uniqueSuffix } from "../helpers/fixtures";

describe("generateJoinCode", () => {
  test("always has the SJ- prefix and 8 uppercase hex characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateJoinCode();
      assert.match(code, /^SJ-[0-9A-F]{8}$/);
    }
  });

  test("is not deterministic", () => {
    const samples = new Set(Array.from({ length: 20 }, () => generateJoinCode()));
    assert.ok(samples.size > 1);
  });
});

describe("generateJoinPin", () => {
  test("is always exactly 4 digits, zero-padded", () => {
    for (let i = 0; i < 200; i++) {
      const pin = generateJoinPin();
      assert.match(pin, /^\d{4}$/);
    }
  });

  test("is not deterministic", () => {
    const samples = new Set(Array.from({ length: 50 }, () => generateJoinPin()));
    assert.ok(samples.size > 1);
  });
});

describe("resolveSchoolByJoinCode (DB-backed)", () => {
  const schoolIds: string[] = [];
  const userIds: string[] = [];

  after(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
  });

  async function makeSchool() {
    const suffix = uniqueSuffix();
    const school = await prisma.school.create({
      data: { name: `Join Code Test School ${suffix}`, joinCode: generateJoinCode(), joinPin: "4242" },
    });
    schoolIds.push(school.id);
    return school;
  }

  test("resolves the school for the correct code+PIN pair", async () => {
    const school = await makeSchool();
    const resolved = await resolveSchoolByJoinCode(prisma, school.joinCode!, "4242");
    assert.equal(resolved.id, school.id);
  });

  test("throws a generic error for a wrong PIN", async () => {
    const school = await makeSchool();
    await assert.rejects(
      () => resolveSchoolByJoinCode(prisma, school.joinCode!, "0000"),
      /Invalid school code or PIN\./
    );
  });

  test("throws the same generic error for an unknown code", async () => {
    await assert.rejects(
      () => resolveSchoolByJoinCode(prisma, "SJ-NOSUCH1", "4242"),
      /Invalid school code or PIN\./
    );
  });

  test("createStudentAccount with a valid join code sets StudentProfile.schoolId", async () => {
    const school = await makeSchool();
    const suffix = uniqueSuffix();
    const user = await prisma.$transaction((tx) =>
      createStudentAccount(tx, {
        name: "Join Code Student",
        email: `join-code-student-${suffix}@example.invalid`,
        passwordHash: "test-hash-not-used-for-login",
        schoolJoinCode: school.joinCode!,
        schoolJoinPin: "4242",
        ipHash: null,
        userAgent: null,
      })
    );
    userIds.push(user.id);

    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    assert.equal(profile?.schoolId, school.id);
    assert.equal(profile?.classId, null);
  });

  test("createStudentAccount with a wrong PIN throws and creates no user", async () => {
    const school = await makeSchool();
    const suffix = uniqueSuffix();
    const email = `join-code-fail-${suffix}@example.invalid`;

    await assert.rejects(() =>
      prisma.$transaction((tx) =>
        createStudentAccount(tx, {
          name: "Join Code Student",
          email,
          passwordHash: "test-hash-not-used-for-login",
          schoolJoinCode: school.joinCode!,
          schoolJoinPin: "0000",
          ipHash: null,
          userAgent: null,
        })
      )
    );

    const created = await prisma.user.findUnique({ where: { email } });
    assert.equal(created, null);
  });
});
