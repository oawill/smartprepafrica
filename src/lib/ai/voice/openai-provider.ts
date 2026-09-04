import { generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";
import type { VoiceProvider, VoiceOption, GeneratedSpeech } from "@/lib/ai/voice/provider";

const MODEL_ID = "tts-1";

// OpenAI's fixed named voices — this provider has no dynamic voices API,
// unlike ElevenLabs/Azure which would list real per-account voices here.
const VOICES: VoiceOption[] = [
  { id: "alloy", label: "Alloy — neutral, clear" },
  { id: "echo", label: "Echo — warm, measured" },
  { id: "fable", label: "Fable — expressive, storyteller" },
  { id: "onyx", label: "Onyx — deep, authoritative" },
  { id: "nova", label: "Nova — bright, energetic" },
  { id: "shimmer", label: "Shimmer — soft, friendly" },
];

// Published OpenAI tts-1 pricing at time of writing: $15 per 1M characters.
// Rough admin-visibility estimate only, same framing as
// src/lib/ai/pricing.ts's estimateCostKobo — not a billing record.
const USD_PER_MILLION_CHARACTERS = 15;
const NGN_PER_USD = 1600;

// Average spoken English pace (~150 words/min, ~5 chars/word) used only to
// give the admin a rough duration before real audio-file probing exists.
const CHARS_PER_SECOND = 12.5;

export const openAiVoiceProvider: VoiceProvider = {
  name: "openai",

  getVoices() {
    return VOICES;
  },

  async generateSpeech({ text, voiceId, speed }): Promise<GeneratedSpeech> {
    const result = await generateSpeech({
      model: openai.speech(MODEL_ID),
      text,
      voice: voiceId,
      outputFormat: "mp3",
      speed,
    });

    return {
      audio: result.audio.uint8Array,
      format: result.audio.format,
      estimatedDurationSec: Math.max(1, Math.round(text.length / CHARS_PER_SECOND)),
    };
  },

  estimateCostKobo(characterCount: number): number {
    const usd = (characterCount / 1_000_000) * USD_PER_MILLION_CHARACTERS;
    return Math.round(usd * NGN_PER_USD * 100);
  },
};
