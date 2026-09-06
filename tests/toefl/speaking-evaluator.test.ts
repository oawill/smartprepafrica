import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isSpeakingEvaluationConfigured } from "../../src/lib/toefl/speaking-evaluator";

describe("isSpeakingEvaluationConfigured", () => {
  // No real provider is implemented yet (Step 13) — this test should be
  // the one that forces a deliberate look at speaking/actions.ts's
  // evalStatus branching once a provider is finally wired in.
  test("is false — no speaking evaluator is implemented yet", () => {
    assert.equal(isSpeakingEvaluationConfigured(), false);
  });
});
