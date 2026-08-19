import { anthropic } from "@ai-sdk/anthropic";

const DEFAULT_MODEL = "claude-sonnet-5";

/** The only place a model id string is chosen — swap providers here, not at call sites. */
export function getCoachModel() {
  return anthropic(getCoachModelId());
}

export function getCoachModelId(): string {
  return process.env.AI_COACH_MODEL || DEFAULT_MODEL;
}

export function isAiCoachConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
