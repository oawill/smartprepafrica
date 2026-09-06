/** Real, computed pace metrics from an actual transcript and recorded
 * duration — factual context fed into the Speaking evaluator's grading
 * prompt, never a substitute for genuine acoustic analysis (that's what
 * "pronunciation" would require, and this app never fabricates that —
 * see openai-speaking-evaluator.ts). */
export function wordsPerMinute(wordCount: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return (wordCount / durationSec) * 60;
}

const FILLER_WORDS = ["um", "uh", "uhh", "umm", "like", "you know", "i mean"];

/** Share of the transcript's words that are filler words/phrases, as a
 * fraction (0-1). Counts multi-word fillers ("you know") as a single
 * occurrence against the total word count. */
export function fillerWordRatio(transcript: string): number {
  const words = transcript.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const lower = transcript.toLowerCase();
  let fillerCount = 0;
  for (const filler of FILLER_WORDS) {
    const matches = lower.match(new RegExp(`\\b${filler}\\b`, "g"));
    fillerCount += matches ? matches.length : 0;
  }
  return Math.min(1, fillerCount / words.length);
}
