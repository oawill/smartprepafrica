// DB-backed tests for Door 3 (sponsor voucher self-redemption at
// registration) — matches tests/school/join-code.test.ts's convention
// for Door 2. Covers the redeemVoucherRecord tx-composability refactor
// and createStudentAccount's new voucherCode wiring.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, createUser, deleteUsers } from "../helpers/fixtures";
import { redeemVoucherRecord } from "../../src/lib/vouchers";
import { createStudentAccount } from "../../src/lib/registration/create-student-account";
import { resolveSchoolByJoinCode } from "../../src/lib/registration/school-join-code";

describe("redeemVoucherRecord with a TransactionClient", () => {
  const userIds: string[] = [];
  const voucherIds: string[] = [];

  after(async () => {
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.voucherRedemption.deleteMany({ where: { voucherId: { in: voucherIds } } });
    await prisma.voucher.deleteMany({ where: { id: { in: voucherIds } } });
    await deleteUsers(userIds);
  });

  test("composes correctly inside an outer transaction, same effect as the top-level call", async () => {
    const issuer = await createUser("SPONSOR", "voucher-tx-issuer");
    userIds.push(issuer.id);
    const student = await createUser("STUDENT", "voucher-tx-student");
    userIds.push(student.id);
    const voucher = await prisma.voucher.create({
      data: { code: `TEST-${uniqueSuffix()}`, plan: "BASIC", status: "ACTIVE", issuedById: issuer.id },
    });
    voucherIds.push(voucher.id);

    await prisma.$transaction((tx) => redeemVoucherRecord(voucher.id, student.id, tx));

    const redemption = await prisma.voucherRedemption.findUnique({ where: { voucherId: voucher.id } });
    const updatedVoucher = await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id } });
    const subscription = await prisma.subscription.findFirst({ where: { userId: student.id } });

    assert.equal(redemption?.userId, student.id);
    assert.equal(updatedVoucher.status, "REDEEMED");
    assert.equal(subscription?.plan, "BASIC");
    assert.equal(subscription?.status, "ACTIVE");
  });
});

describe("createStudentAccount with a sponsor voucher code (Door 3)", () => {
  const userIds: string[] = [];
  const voucherIds: string[] = [];
  const schoolIds: string[] = [];

  after(async () => {
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.voucherRedemption.deleteMany({ where: { voucherId: { in: voucherIds } } });
    await prisma.voucher.deleteMany({ where: { id: { in: voucherIds } } });
    await deleteUsers(userIds);
    await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
  });

  async function makeVoucher(plan: "BASIC" | "PREMIUM" = "BASIC") {
    const issuer = await createUser("SPONSOR", "voucher-registration-issuer");
    userIds.push(issuer.id);
    const voucher = await prisma.voucher.create({
      data: { code: `TEST-${uniqueSuffix()}`, plan, status: "ACTIVE", issuedById: issuer.id },
    });
    voucherIds.push(voucher.id);
    return voucher;
  }

  test("a valid voucher code grants a Subscription and marks the voucher REDEEMED", async () => {
    const voucher = await makeVoucher("PREMIUM");
    const suffix = uniqueSuffix();
    const user = await prisma.$transaction((tx) =>
      createStudentAccount(tx, {
        name: "Voucher Student",
        email: `voucher-student-${suffix}@example.invalid`,
        passwordHash: "test-hash-not-used-for-login",
        voucherCode: voucher.code,
        ipHash: null,
        userAgent: null,
      })
    );
    userIds.push(user.id);

    const subscription = await prisma.subscription.findFirst({ where: { userId: user.id } });
    const updatedVoucher = await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id } });

    assert.equal(subscription?.plan, "PREMIUM");
    assert.equal(subscription?.status, "ACTIVE");
    assert.equal(updatedVoucher.status, "REDEEMED");
  });

  test("an already-redeemed voucher code throws and rolls back the whole registration", async () => {
    const voucher = await makeVoucher();
    // Redeem it once for an unrelated user first, so it's REDEEMED.
    const firstUser = await createUser("STUDENT", "voucher-already-redeemed");
    userIds.push(firstUser.id);
    await prisma.$transaction((tx) => redeemVoucherRecord(voucher.id, firstUser.id, tx));

    const suffix = uniqueSuffix();
    const email = `voucher-fail-${suffix}@example.invalid`;
    await assert.rejects(() =>
      prisma.$transaction((tx) =>
        createStudentAccount(tx, {
          name: "Voucher Student",
          email,
          passwordHash: "test-hash-not-used-for-login",
          voucherCode: voucher.code,
          ipHash: null,
          userAgent: null,
        })
      )
    );

    const created = await prisma.user.findUnique({ where: { email } });
    assert.equal(created, null);
  });

  test("an unknown voucher code throws and creates no user", async () => {
    const suffix = uniqueSuffix();
    const email = `voucher-unknown-${suffix}@example.invalid`;
    await assert.rejects(
      () =>
        prisma.$transaction((tx) =>
          createStudentAccount(tx, {
            name: "Voucher Student",
            email,
            passwordHash: "test-hash-not-used-for-login",
            voucherCode: "TEST-NOSUCHCODE",
            ipHash: null,
            userAgent: null,
          })
        ),
      /Invalid sponsor code\./
    );

    const created = await prisma.user.findUnique({ where: { email } });
    assert.equal(created, null);
  });

  test("composes with a Door 2 school join code: both effects land in one registration", async () => {
    const voucher = await makeVoucher();
    const schoolSuffix = uniqueSuffix();
    const school = await prisma.school.create({
      data: { name: `Voucher+JoinCode School ${schoolSuffix}`, joinCode: `SJ-${schoolSuffix.slice(-6).toUpperCase()}`, joinPin: "1234" },
    });
    schoolIds.push(school.id);
    // Sanity-check the fixture resolves before using it in the real call.
    await resolveSchoolByJoinCode(prisma, school.joinCode!, "1234");

    const suffix = uniqueSuffix();
    const user = await prisma.$transaction((tx) =>
      createStudentAccount(tx, {
        name: "Voucher JoinCode Student",
        email: `voucher-joincode-${suffix}@example.invalid`,
        passwordHash: "test-hash-not-used-for-login",
        schoolJoinCode: school.joinCode!,
        schoolJoinPin: "1234",
        voucherCode: voucher.code,
        ipHash: null,
        userAgent: null,
      })
    );
    userIds.push(user.id);

    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    const subscription = await prisma.subscription.findFirst({ where: { userId: user.id } });

    assert.equal(profile?.schoolId, school.id);
    assert.equal(subscription?.plan, "BASIC");
  });
});
