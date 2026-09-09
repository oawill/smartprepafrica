import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { getPaymentProvider, getDefaultPaymentProviderName } from "../../src/lib/payments";
import { PaystackProvider } from "../../src/lib/payments/paystack-provider";

describe("getPaymentProvider", () => {
  test("returns the Paystack provider by name", () => {
    assert.equal(getPaymentProvider("paystack").name, "paystack");
  });

  test("returns the Flutterwave provider by name", () => {
    assert.equal(getPaymentProvider("flutterwave").name, "flutterwave");
  });

  test("throws for an unknown provider name", () => {
    assert.throws(() => getPaymentProvider("unknown-provider"), /Unknown payment provider/);
  });
});

describe("getDefaultPaymentProviderName", () => {
  test("is paystack — the only live, checkout-reachable provider today", () => {
    assert.equal(getDefaultPaymentProviderName(), "paystack");
  });
});

describe("FlutterwaveProvider (unconfigured stub)", () => {
  test("initializeTransaction rejects with a clear 'not configured' message when no key is set", async () => {
    const original = process.env.FLUTTERWAVE_SECRET_KEY;
    delete process.env.FLUTTERWAVE_SECRET_KEY;
    try {
      await assert.rejects(
        () =>
          getPaymentProvider("flutterwave").initializeTransaction({
            email: "test@example.invalid",
            amountMinor: 10_000,
            currency: "NGN",
            reference: "test-ref",
            callbackUrl: "https://example.invalid/callback",
            metadata: {},
          }),
        /Flutterwave is not configured/
      );
    } finally {
      if (original) process.env.FLUTTERWAVE_SECRET_KEY = original;
    }
  });

  test("verifyTransaction rejects with the same message when no key is set", async () => {
    const original = process.env.FLUTTERWAVE_SECRET_KEY;
    delete process.env.FLUTTERWAVE_SECRET_KEY;
    try {
      await assert.rejects(
        () => getPaymentProvider("flutterwave").verifyTransaction("test-ref"),
        /Flutterwave is not configured/
      );
    } finally {
      if (original) process.env.FLUTTERWAVE_SECRET_KEY = original;
    }
  });

  test("verifyWebhookSignature returns false with no configured secret hash", () => {
    const headers = new Headers({ "verif-hash": "anything" });
    assert.equal(getPaymentProvider("flutterwave").verifyWebhookSignature("{}", headers), false);
  });
});

describe("PaystackProvider.verifyWebhookSignature", () => {
  const provider = new PaystackProvider();
  let originalKey: string | undefined;

  before(() => {
    originalKey = process.env.PAYSTACK_SECRET_KEY;
    process.env.PAYSTACK_SECRET_KEY = "test-secret-key";
  });
  after(() => {
    if (originalKey) process.env.PAYSTACK_SECRET_KEY = originalKey;
    else delete process.env.PAYSTACK_SECRET_KEY;
  });

  function signatureFor(body: string): string {
    return crypto.createHmac("sha512", "test-secret-key").update(body).digest("hex");
  }

  test("accepts a signature computed with the correct secret over the exact body", () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "abc123" } });
    const headers = new Headers({ "x-paystack-signature": signatureFor(body) });
    assert.equal(provider.verifyWebhookSignature(body, headers), true);
  });

  test("rejects a tampered body against the original signature", () => {
    const originalBody = JSON.stringify({ event: "charge.success", data: { reference: "abc123" } });
    const tamperedBody = JSON.stringify({ event: "charge.success", data: { reference: "xyz789" } });
    const headers = new Headers({ "x-paystack-signature": signatureFor(originalBody) });
    assert.equal(provider.verifyWebhookSignature(tamperedBody, headers), false);
  });

  test("rejects when no signature header is present", () => {
    const body = JSON.stringify({ event: "charge.success" });
    assert.equal(provider.verifyWebhookSignature(body, new Headers()), false);
  });
});
