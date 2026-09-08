"use client";

import { useState } from "react";
import { saveExamSubjects } from "@/app/practice/subjects/actions";

type SubjectOption = { id: string; name: string };

export function SubjectSelectionForm({
  exam,
  allSubjects,
  initialSelectedIds,
  compulsoryNames,
  subjectIdsWithActivity,
  useWaecSubjects,
}: {
  exam: string;
  allSubjects: SubjectOption[];
  initialSelectedIds: string[];
  compulsoryNames: string[];
  /** Subject ids the student has existing attempt history for — unchecking
   * one of these triggers a confirmation before saving. */
  subjectIdsWithActivity: string[];
  /** Present only on the NECO picker when a WAEC profile exists. */
  useWaecSubjects?: SubjectOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));
  const activitySet = new Set(subjectIdsWithActivity);

  function toggle(subjectId: string, name: string) {
    if (compulsoryNames.includes(name)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  }

  function useWaec() {
    if (!useWaecSubjects) return;
    const waecIds = useWaecSubjects.filter((s) => allSubjects.some((a) => a.id === s.id)).map((s) => s.id);
    setSelected(new Set(waecIds));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const removedWithActivity = [...initialSelectedIds].some(
      (id) => activitySet.has(id) && !selected.has(id)
    );
    if (removedWithActivity) {
      const removedNames = allSubjects
        .filter((s) => initialSelectedIds.includes(s.id) && activitySet.has(s.id) && !selected.has(s.id))
        .map((s) => s.name)
        .join(", ");
      const ok = window.confirm(
        `Remove ${removedNames} from your preparation subjects? Your past scores and progress will still be saved — you can add it back anytime.`
      );
      if (!ok) {
        e.preventDefault();
      }
    }
  }

  return (
    <form action={saveExamSubjects} onSubmit={handleSubmit}>
      <input type="hidden" name="exam" value={exam} />

      {useWaecSubjects && useWaecSubjects.length > 0 && (
        <button
          type="button"
          onClick={useWaec}
          className="mb-4 rounded-full border border-brand/40 bg-brand/5 px-4 py-2 text-sm font-medium text-brand-text hover:border-brand"
        >
          Use My WAEC Subjects
        </button>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {allSubjects.map((subject) => {
          const isCompulsory = compulsoryNames.includes(subject.name);
          const isChecked = selected.has(subject.id) || isCompulsory;
          return (
            <label
              key={subject.id}
              className={`flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary ${
                isCompulsory ? "opacity-80" : ""
              }`}
            >
              <input
                type="checkbox"
                name="subjects"
                value={subject.id}
                checked={isChecked}
                disabled={isCompulsory}
                onChange={() => toggle(subject.id, subject.name)}
                className="accent-brand"
              />
              {subject.name}
              {isCompulsory && <span className="ml-auto text-xs text-text-muted">Compulsory</span>}
            </label>
          );
        })}
      </div>

      <button
        type="submit"
        className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
      >
        Save My Subjects
      </button>
    </form>
  );
}
