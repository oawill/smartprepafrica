/** Autosave hardening: resume at the first unanswered question rather
 * than always index 0, so a refresh doesn't lose the student's place.
 * Falls back to the last item if everything is already answered. */
export function firstUnansweredIndex(
  items: { selectedOption: string | null; numericAnswer: string | null }[]
): number {
  const idx = items.findIndex((i) => i.selectedOption === null && i.numericAnswer === null);
  return idx === -1 ? Math.max(0, items.length - 1) : idx;
}
