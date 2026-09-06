export type SpeakingEvaluationResult = {
  estimatedScore: number;
  fluency: number;
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  taskCompletion: number;
  feedback: string;
};

/** Provider-agnostic evaluation contract (mirrors src/lib/ai/voice/provider.ts's
 * VoiceProvider) — a future concrete implementation (calling an AI model
 * against the recording) plugs in here without the recording UI or
 * server action needing to change. */
export interface SpeakingEvaluator {
  evaluateSpeakingResponse(opts: { audioUrl: string; promptText: string }): Promise<SpeakingEvaluationResult>;
}

/** No provider is registered yet — Step 13 implements a real one and this
 * starts returning true. Until then, every speaking submission is
 * honestly marked evalStatus: UNAVAILABLE rather than a fabricated
 * score. */
export function isSpeakingEvaluationConfigured(): boolean {
  return false;
}
