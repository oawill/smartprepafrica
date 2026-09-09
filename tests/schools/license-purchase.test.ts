// DB-backed tests for school bulk licences — real queries against the
// local dev database, matching tests/helpers/fixtures.ts's convention.
// issueLicenseSeats/redeemVoucherRecord don't touch Paystack, so they're
// directly testable; activateSchoolLicensePurchaseForReference itself
// (which does call the live Paystack API to verify) is exercised via
// live QA instead, same convention as every other Paystack-backed flow
// in this codebase.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, createUser, deleteUsers } from "../helpers/fixtures";
import { issueLicenseSeats } from "../../src/lib/schools/license-checkout";
import { redeemVoucherRecord } from "../../src/lib/vouchers";
import { getUserPlan } from "../../src/lib/ai/limits";

describe("issueLicenseSeats", () => {
  const userIds: string[] = [];
  const schoolIds: string[] = [];
  const purchaseIds: string[] = [];

  after(async () => {
    await prisma.voucher.deleteMany({ where: { schoolLicensePurchaseId: { in: purchaseIds } } });
    await prisma.schoolLicensePurchase.deleteMany({ where: { id: { in: purchaseIds } } });
    await deleteUsers(userIds);
    await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
  });

  async function makePurchase(seatCount: number) {
    const admin = await createUser("SCHOOL_ADMIN", "license-purchase-admin");
    userIds.push(admin.id);
    const school = await prisma.school.create({ data: { name: `License Test School ${uniqueSuffix()}` } });
    schoolIds.push(school.id);
    const purchase = await prisma.schoolLicensePurchase.create({
      data: {
        schoolId: school.id,
        purchasedById: admin.id,
        plan: "SCHOOL",
        seatCount,
        durationDays: 365,
        amountKobo: 200_000 * seatCount,
        reference: `test-slp-${uniqueSuffix()}`,
        status: "PENDING",
      },
    });
    purchaseIds.push(purchase.id);
    return { purchase, school, admin };
  }

  test("creates exactly seatCount vouchers, all on the purchase's plan", async () => {
    const { purchase } = await makePurchase(5);

    await issueLicenseSeats(purchase);

    const vouchers = await prisma.voucher.findMany({ where: { schoolLicensePurchaseId: purchase.id } });
    assert.equal(vouchers.length, 5);
    assert.ok(vouchers.every((v) => v.plan === "SCHOOL" && v.status === "ACTIVE"));
  });

  test("redeeming an issued seat grants a real SCHOOL-plan subscription", async () => {
    const { purchase } = await makePurchase(1);
    await issueLicenseSeats(purchase);
    const voucher = await prisma.voucher.findFirstOrThrow({ where: { schoolLicensePurchaseId: purchase.id } });

    const student = await createUser("STUDENT", "license-redeem-student");
    userIds.push(student.id);

    await redeemVoucherRecord(voucher.id, student.id);

    const plan = await getUserPlan(student.id);
    assert.equal(plan, "SCHOOL");
  });

  test("a school's seat pool is exhausted after every voucher is redeemed", async () => {
    const { purchase } = await makePurchase(1);
    await issueLicenseSeats(purchase);
    const voucher = await prisma.voucher.findFirstOrThrow({ where: { schoolLicensePurchaseId: purchase.id } });

    const student = await createUser("STUDENT", "license-exhaust-student");
    userIds.push(student.id);
    await redeemVoucherRecord(voucher.id, student.id);

    const stillAvailable = await prisma.voucher.findFirst({
      where: { status: "ACTIVE", schoolLicensePurchaseId: purchase.id },
    });
    assert.equal(stillAvailable, null);
  });
});
