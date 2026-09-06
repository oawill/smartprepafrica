import { generateObject } from "ai";
import { z } from "zod";
import { getCoachModel } from "@/lib/ai/provider";
import type { WritingEvaluator, WritingEvaluationResult } from "@/lib/toefl/writing-evaluator";

const scoreField = z.number().min(0).max(6);

const resultSchema = z.object({
  estimatedScore: scoreField,
  organization: scoreField,
  grammar: scoreField,
  vocabulary: scoreField,
  clarity: scoreField,
  taskCompletion: scoreField,
  feedback: z.string(),
});

export const claudeWritingEvaluator: WritingEvaluator = {
  async evaluateWritingResponse({ promptText, responseText, wordCount }): Promise<WritingEvaluationResult> {
    const { object } = await generateObject({
      model: getCoachModel(),
      schema: resultSchema,
      prompt: `You are scoring a TOEFL iBT independent writing task response on the real 0-6 TOEFL writing band scale.

Writing prompt:
"""
${promptText}
"""

Student response (${wordCount} words):
"""
${responseText}
"""

Score the response honestly on each of these 0-6 dimensions:
- organization: paragraph structure, logical flow, clear thesis/support
- grammar: sentence-level correctness
- vocabulary: range and precision of word choice
- clarity: how clearly the ideas are communicated
- taskCompletion: how directly and fully the response addresses the prompt
- estimatedScore: your holistic overall score for this response, 0-6

Give a low score where warranted — do not inflate scores for a short,
off-topic, or low-quality response. Write 2-4 sentences of specific,
constructive feedback referencing the actual content of the response.`,
    });
    return object;
  },
};
