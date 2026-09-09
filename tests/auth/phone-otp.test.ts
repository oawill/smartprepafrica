import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import {
  createOtp,
  verifyOtp,
  consumeOtpForPhone,
  getLiveOtp,
  isUnderResendCooldown,
  isPhoneRateLimited,
} from "../../src/lib/phone-otp";
import { hashOtp } from "../../src/lib/otp";
import { prisma, uniqueSuffix } from "../helpers/fixtures";

function testPhone() {
  // Distinct fake E.164-shaped number per test, so tests never share
  // rate-limit/cooldown state with each other.
  return `+1555${uniqueSuffix().replace(/\D/g, "").slice(0, 7).padEnd(7, "0")}`;
}

describe("phone-otp mechanics (DB-backed)", () => {
  const phones: string[] = [];

  after(async () => {
    await prisma.phoneOtp.deleteMany({ where: { phone: { in: phones } } });
  });

  test("createOtp persists a hashed, live OTP for the phone", async () => {
    const phone = testPhone();
    phones.push(phone);

    const otp = await createOtp(phone, null);
    assert.match(otp, /^\d{6}$/);

    const live = await getLiveOtp(phone);
    assert.ok(live);
    assert.equal(live!.otpHash, hashOtp(otp));
    assert.equal(live!.consumedAt, null);
  });

  test("verifyOtp returns VALID for the correct code and does not consume it", async () => {
    const phone = testPhone();
    phones.push(phone);
    const otp = await createOtp(phone, null);

    assert.equal(await verifyOtp(phone, otp), "VALID");

    const live = await getLiveOtp(phone);
    assert.ok(live, "OTP must still be live after a VALID verify — the caller consumes it");
  });

  test("verifyOtp returns INVALID for a wrong code, then LOCKED after maxAttempts", async () => {
    const phone = testPhone();
    phones.push(phone);
    await createOtp(phone, null);

    for (let i = 0; i < 4; i++) {
      assert.equal(await verifyOtp(phone, "000000"), "INVALID");
    }
    assert.equal(await verifyOtp(phone, "000000"), "LOCKED");

    // Once locked, even the real code no longer verifies.
    const live = await getLiveOtp(phone);
    assert.equal(live, null);
  });

  test("verifyOtp returns EXPIRED_OR_MISSING when no OTP was ever sent", async () => {
    const phone = testPhone();
    phones.push(phone);
    assert.equal(await verifyOtp(phone, "123456"), "EXPIRED_OR_MISSING");
  });

  test("consumeOtpForPhone marks the live OTP consumed, so it's no longer live", async () => {
    const phone = testPhone();
    phones.push(phone);
    const otp = await createOtp(phone, null);
    assert.equal(await verifyOtp(phone, otp), "VALID");

    await consumeOtpForPhone(phone);

    assert.equal(await getLiveOtp(phone), null);
  });

  test("createOtp invalidates a prior live OTP for the same phone", async () => {
    const phone = testPhone();
    phones.push(phone);
    const first = await createOtp(phone, null);
    const second = await createOtp(phone, null);

    // The first code no longer matches the now-live (second) OTP, so it
    // reads as a wrong-code attempt against the current one, not as
    // "no live OTP at all" — there IS a live OTP, just not this code.
    assert.equal(await verifyOtp(phone, first), "INVALID");
    assert.equal(await verifyOtp(phone, second), "VALID");
  });

  test("isUnderResendCooldown is true immediately after issuing an OTP", async () => {
    const phone = testPhone();
    phones.push(phone);
    await createOtp(phone, null);
    assert.equal(await isUnderResendCooldown(phone), true);
  });

  test("isPhoneRateLimited trips after the per-phone window max", async () => {
    const phone = testPhone();
    phones.push(phone);
    for (let i = 0; i < 3; i++) {
      await createOtp(phone, null);
    }
    assert.equal(await isPhoneRateLimited(phone), true);
  });
});
