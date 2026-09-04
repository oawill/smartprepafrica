import { anthropic } from "@ai-sdk/anthropic";

const DEFAULT_MODEL = "claude-sonnet-5";

/** Same provider/chokepoint pattern as src/lib/ai/provider.ts's getCoachModel
 * — same API key, same SDK, just a separate model-id override so video
 * generation can be tuned independently of the chat coach later. */
export function getVideoScriptModel() {
  return anthropic(getVideoScriptModelId());
}

export function getVideoScriptModelId(): string {
  return process.env.AI_VIDEO_MODEL || DEFAULT_MODEL;
}

export function isVideoAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
