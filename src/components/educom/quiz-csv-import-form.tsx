"use client";

import { useActionState } from "react";
import { importQuizQuestionsCsv, type QuizCsvImportResult } from "@/app/dashboard/teacher/courses/actions";

const initialState: QuizCsvImportResult = { imported: 0, skipped: [] };

export function QuizCsvImportForm({ lessonId }: { lessonId: string }) {
  const [state, formAction, isPending] = useActionState(importQuizQuestionsCsv, initialState);

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="lessonId" value={lessonId} />
        <label className="block text-xs text-text-secondary" htmlFor="csvFile">
          Bulk-import questions (CSV columns: prompt,optionA,optionB,optionC,optionD,correctOption)
        </label>
        <input
          id="csvFile"
          name="csvFile"
          type="file"
          accept=".csv,text/csv"
          required
          className="w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-surface-sunken file:px-3 file:py-1.5 file:text-sm file:text-text-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted disabled:opacity-60"
        >
          {isPending ? "Importing…" : "Import CSV"}
        </button>
      </form>

      {(state.imported > 0 || state.skipped.length > 0) && (
        <div className="mt-3 space-y-1 text-xs">
          {state.imported > 0 && (
            <p className="text-success">
              {state.imported} question{state.imported === 1 ? "" : "s"} imported.
            </p>
          )}
          {state.skipped.length > 0 && (
            <div>
              <p className="text-warning">
                {state.skipped.length} row{state.skipped.length === 1 ? "" : "s"} skipped.
              </p>
              <ul className="mt-1 space-y-0.5 text-text-secondary">
                {state.skipped.map((row, i) => (
                  <li key={i}>
                    Row {row.row}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
