export type SpeakingEvaluationResult = {
  estimatedScore: number;
  fluency: number;
  // Never fabricated: pronunciation can't be judged from a text
  // transcript, so the concrete evaluator always leaves this null
  // rather than asking an LLM to guess a number from text alone.
  pronunciation: number | null;
  grammar: number;
  vocabulary: number;
  taskCompletion: number;
  feedback: string;
};

/** Provider-agnostic evaluation contract (mirrors src/lib/ai/voice/provider.ts's
 * VoiceProvider) — the concrete implementation (openai-speaking-evaluator.ts,
 * Step 13) plugs in here without the recording UI or server action
 * needing to change. */
export interface SpeakingEvaluator {
  evaluateSpeakingResponse(opts: { audioUrl: string; promptText: string; durationSec: number }): Promise<SpeakingEvaluationResult>;
}

/** Needs OpenAI (real audio transcription) AND Anthropic (grading the
 * real transcript) — both configured is the bar for a genuine
 * evaluation; either missing means every speaking submission stays
 * honestly marked evalStatus: UNAVAILABLE rather than a fabricated
 * score. */
export function isSpeakingEvaluationConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && !!process.env.ANTHROPIC_API_KEY;
}
