// Pure-function tests for rewriteEducomPath — the /educom -> /learn
// redirect logic extracted from src/proxy.ts for direct testability
// (query-string handling is left to the caller's plain URL rebuild, not
// tested here). Same convention as tests/school/performance.test.ts (no
// DB, no Next.js runtime needed).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { rewriteEducomPath } from "../../src/proxy";

describe("rewriteEducomPath", () => {
  test("the bare catalog path redirects", () => {
    assert.equal(rewriteEducomPath("/educom"), "/learn");
  });

  test("a course detail path redirects", () => {
    assert.equal(rewriteEducomPath("/educom/abc123"), "/learn/abc123");
  });

  test("a nested lesson path redirects, preserving every segment", () => {
    assert.equal(
      rewriteEducomPath("/educom/abc/lessons/xyz"),
      "/learn/abc/lessons/xyz"
    );
  });

  test("a non-/educom path is left alone", () => {
    assert.equal(rewriteEducomPath("/dashboard"), null);
  });

  test("a path that merely contains 'educom' as a substring elsewhere is left alone", () => {
    assert.equal(rewriteEducomPath("/dashboard/educom-notes"), null);
  });
});
