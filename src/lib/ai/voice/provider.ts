export type VoiceOption = { id: string; label: string };

export type GeneratedSpeech = {
  audio: Uint8Array;
  format: string;
  /** A heuristic estimate from text length — TTS providers don't return
   * actual rendered duration, so this is never exact. Replaced with the
   * real duration once actual audio playback/probing exists in a later
   * phase. */
  estimatedDurationSec: number;
};

/** Provider-agnostic voice generation contract (brief section 19) — swap
 * the concrete implementation in src/lib/ai/voice/openai-provider.ts for
 * ElevenLabs/Google/Azure later without touching any call site. */
export interface VoiceProvider {
  readonly name: string;
  getVoices(): VoiceOption[];
  generateSpeech(opts: { text: string; voiceId: string; speed?: number }): Promise<GeneratedSpeech>;
  estimateCostKobo(characterCount: number): number;
}

export function isVoiceConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
