import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isSpeakingEvaluationConfigured } from "../../src/lib/toefl/speaking-evaluator";

describe("isSpeakingEvaluationConfigured", () => {
  // A real evaluator exists (Step 13), gated on both OPENAI_API_KEY and
  // ANTHROPIC_API_KEY being set. This bare test process never loads
  // .env (nothing here imports the Prisma client, which is what
  // triggers dotenv as a side effect elsewhere in this repo), so both
  // are genuinely unset here — asserting the honest "not configured"
  // default, not that no evaluator exists.
  test("is false when neither provider's API key is set in the environment", () => {
    assert.equal(isSpeakingEvaluationConfigured(), false);
  });
});
