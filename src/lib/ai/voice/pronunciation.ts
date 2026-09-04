import { prisma } from "@/lib/prisma";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Applies every VoicePronunciationOverride as a whole-word,
 * case-insensitive replace on narration text immediately before it's sent
 * to a voice provider. Never persisted back onto the scene — the override
 * only affects the audio, not the displayed/edited narration text. */
export async function applyPronunciationOverrides(text: string): Promise<string> {
  const overrides = await prisma.voicePronunciationOverride.findMany();
  if (overrides.length === 0) return text;

  let result = text;
  for (const override of overrides) {
    const pattern = new RegExp(`\\b${escapeRegExp(override.displayText)}\\b`, "gi");
    result = result.replace(pattern, override.pronunciationText);
  }
  return result;
}
