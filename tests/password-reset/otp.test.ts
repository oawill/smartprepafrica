import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateOtp, hashOtp, buildPasswordResetOtpEmail } from "../../src/lib/password-reset";

describe("generateOtp", () => {
  test("always produces exactly 6 digits", () => {
    for (let i = 0; i < 200; i++) {
      const otp = generateOtp();
      assert.equal(otp.length, 6);
      assert.match(otp, /^\d{6}$/);
    }
  });

  test("zero-pads small values (verifiable via distribution over many samples)", () => {
    const samples = Array.from({ length: 500 }, () => generateOtp());
    assert.ok(samples.some((s) => s.startsWith("0")), "expected at least one zero-padded OTP across 500 samples");
  });

  test("is not deterministic/hardcoded", () => {
    const samples = new Set(Array.from({ length: 50 }, () => generateOtp()));
    assert.ok(samples.size > 1, "OTPs must vary between calls, not be a fixed value");
  });
});

describe("hashOtp", () => {
  test("is deterministic for the same input", () => {
    assert.equal(hashOtp("123456"), hashOtp("123456"));
  });

  test("different OTPs hash differently", () => {
    assert.notEqual(hashOtp("123456"), hashOtp("654321"));
  });

  test("never returns the raw OTP", () => {
    const hash = hashOtp("123456");
    assert.notEqual(hash, "123456");
    assert.ok(!hash.includes("123456"));
  });

  test("produces a 64-char hex SHA-256 digest", () => {
    assert.match(hashOtp("000000"), /^[0-9a-f]{64}$/);
  });
});

describe("buildPasswordResetOtpEmail", () => {
  test("includes the OTP, expiry notice, and SmartPrepAfrica branding", () => {
    const { subject, html } = buildPasswordResetOtpEmail("482913");
    assert.equal(subject, "SmartPrepAfrica Password Reset Code");
    assert.ok(html.includes("482913"));
    assert.ok(html.includes("expires in 10 minutes"));
    assert.ok(html.includes("SmartPrepAfrica"));
  });
});
