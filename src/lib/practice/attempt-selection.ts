/** Groups eligible questions into "selection units" — a standalone question
 * is a unit of size 1, and questions sharing a passageGroupId collapse into
 * one unit (sorted by passageOrder) so a passage is never split across the
 * requested-count truncation boundary. For subjects/exams with zero passage
 * groups every unit is size 1, so this reduces to the original flat
 * shuffle-and-slice behavior. */

type EligibleQuestion = {
  id: string;
  passageGroupId: string | null;
  passageOrder: number | null;
};

type SelectionUnit = {
  questionIds: string[];
};

export function buildSelectionUnits(eligible: EligibleQuestion[]): SelectionUnit[] {
  const standalone: SelectionUnit[] = [];
  const groups = new Map<string, EligibleQuestion[]>();

  for (const q of eligible) {
    if (!q.passageGroupId) {
      standalone.push({ questionIds: [q.id] });
      continue;
    }
    const members = groups.get(q.passageGroupId) ?? [];
    members.push(q);
    groups.set(q.passageGroupId, members);
  }

  const grouped: SelectionUnit[] = [...groups.values()].map((members) => ({
    questionIds: [...members]
      .sort((a, b) => (a.passageOrder ?? 0) - (b.passageOrder ?? 0))
      .map((m) => m.id),
  }));

  return [...standalone, ...grouped];
}

/** Shuffles selection units, then greedily packs them into `requestedCount`
 * slots — skipping (not stopping at) a unit that no longer fits, so a
 * passage group is always taken whole or not at all. Returns an ordered
 * list of question ids; consecutive ids belonging to the same unit are
 * guaranteed contiguous, which is what lets the exam runner treat "next
 * question" as automatically walking into/out of a passage group. */
export function selectContiguousUnits(
  units: SelectionUnit[],
  requestedCount: number
): string[] {
  const shuffled = [...units].sort(() => Math.random() - 0.5);
  const selected: string[] = [];
  let remaining = requestedCount;

  for (const unit of shuffled) {
    if (unit.questionIds.length === 0) continue;
    if (unit.questionIds.length > remaining) continue;
    selected.push(...unit.questionIds);
    remaining -= unit.questionIds.length;
    if (remaining <= 0) break;
  }

  return selected;
}
