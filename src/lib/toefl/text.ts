/** Pure word-count helper — shared by the writing editor's live counter
 * and the server-side save so both agree on the same definition. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}
