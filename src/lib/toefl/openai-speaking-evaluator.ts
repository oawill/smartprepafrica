import { transcribe, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getCoachModel } from "@/lib/ai/provider";
import { wordsPerMinute, fillerWordRatio } from "@/lib/toefl/speaking-metrics";
import type { SpeakingEvaluator, SpeakingEvaluationResult } from "@/lib/toefl/speaking-evaluator";

const TRANSCRIPTION_MODEL_ID = "whisper-1";

const scoreField = z.number().min(0).max(6);

// Deliberately no "pronunciation" field — the model is never asked for
// one, since it only ever sees a text transcript, never the audio
// itself. See speaking-evaluator.ts's SpeakingEvaluationResult comment.
const resultSchema = z.object({
  estimatedScore: scoreField,
  fluency: scoreField,
  grammar: scoreField,
  vocabulary: scoreField,
  taskCompletion: scoreField,
  feedback: z.string(),
});

export const openAiSpeakingEvaluator: SpeakingEvaluator = {
  async evaluateSpeakingResponse({ audioUrl, promptText, durationSec }): Promise<SpeakingEvaluationResult> {
    const { text: transcript } = await transcribe({
      model: openai.transcription(TRANSCRIPTION_MODEL_ID),
      audio: new URL(audioUrl),
    });

    const wpm = wordsPerMinute(transcript.trim().split(/\s+/).filter(Boolean).length, durationSec);
    const fillerRatio = fillerWordRatio(transcript);

    const { object } = await generateObject({
      model: getCoachModel(),
      schema: resultSchema,
      prompt: `You are scoring a TOEFL iBT independent speaking task response on the real 0-6 TOEFL speaking band scale. You are given a transcript of the student's spoken response — you cannot hear the actual audio, so never comment on or infer pronunciation, accent, or voice quality.

Speaking prompt:
"""
${promptText}
"""

Transcript of the student's spoken response (${durationSec.toFixed(0)}s recording, ~${Math.round(wpm)} words per minute, ~${Math.round(fillerRatio * 100)}% filler words like "um"/"uh"/"like"):
"""
${transcript || "(no speech was transcribed — the recording may have been silent or too short)"}
"""

Score honestly on each of these 0-6 dimensions, based only on the transcript content and the real pace/filler-word stats above:
- fluency: coherence, pacing, and how naturally the response flows (use the real WPM and filler-word rate as evidence, not just content)
- grammar: sentence-level correctness in what was said
- vocabulary: range and precision of word choice
- taskCompletion: how directly and fully the response addresses the prompt
- estimatedScore: your holistic overall score for this response, 0-6

Give a low score where warranted — do not inflate scores for a short,
silent, or off-topic response. Write 2-4 sentences of specific,
constructive feedback referencing the actual content of the transcript,
and always include one explicit sentence noting that pronunciation is
not assessed by this evaluator since only a text transcript, not the
audio itself, was analyzed.`,
    });

    return { ...object, pronunciation: null };
  },
};
