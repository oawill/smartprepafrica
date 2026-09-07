import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { passwordMeetsPolicy, firstPasswordPolicyFailure, PASSWORD_RULES } from "../../src/lib/password-policy";

describe("passwordMeetsPolicy", () => {
  test("accepts a password meeting all 4 rules", () => {
    assert.equal(passwordMeetsPolicy("Str0ngPass"), true);
  });

  test("rejects too short", () => {
    assert.equal(passwordMeetsPolicy("Sh0rt"), false);
  });

  test("rejects missing uppercase", () => {
    assert.equal(passwordMeetsPolicy("weakpass1"), false);
  });

  test("rejects missing lowercase", () => {
    assert.equal(passwordMeetsPolicy("WEAKPASS1"), false);
  });

  test("rejects missing number", () => {
    assert.equal(passwordMeetsPolicy("WeakPassword"), false);
  });

  test("rejects empty string", () => {
    assert.equal(passwordMeetsPolicy(""), false);
  });
});

describe("firstPasswordPolicyFailure", () => {
  test("returns null when the password meets every rule", () => {
    assert.equal(firstPasswordPolicyFailure("Str0ngPass"), null);
  });

  test("returns a message when any rule fails", () => {
    assert.ok(firstPasswordPolicyFailure("weak") !== null);
  });
});

describe("PASSWORD_RULES", () => {
  test("covers exactly the spec's 4 requirements", () => {
    assert.deepEqual(
      PASSWORD_RULES.map((r) => r.key).sort(),
      ["length", "lowercase", "number", "uppercase"]
    );
  });
});
