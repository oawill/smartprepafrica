"use client";

import { useState } from "react";
import { MessageContent } from "@/components/ai-coach/message-content";

export type PassageFormValue = {
  id?: string;
  exam: string;
  subjectId: string;
  type: string;
  title: string | null;
  instructions: string | null;
  bodyText: string;
  showLineNumbers: boolean;
  startingLineNumber: number;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500";
const labelClass = "block text-xs text-slate-400";

const PASSAGE_TYPE_OPTIONS = [
  { value: "COMPREHENSION", label: "English Comprehension" },
  { value: "PROSE_EXTRACT", label: "Prose Extract" },
  { value: "POETRY", label: "Poetry" },
  { value: "DRAMA_EXTRACT", label: "Drama Extract" },
  { value: "DIALOGUE", label: "Dialogue" },
  { value: "LITERARY_EXTRACT", label: "Literary Extract" },
  { value: "OTHER", label: "Other" },
];

export function PassageForm({
  action,
  subjects,
  initial,
}: {
  action: (formData: FormData) => void;
  subjects: { id: string; name: string }[];
  initial?: PassageFormValue;
}) {
  const [bodyText, setBodyText] = useState(initial?.bodyText ?? "");
  const [showLineNumbers, setShowLineNumbers] = useState(initial?.showLineNumbers ?? false);

  return (
    <form action={action} className="space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Exam</label>
          <select name="exam" defaultValue={initial?.exam ?? "WAEC"} className={inputClass}>
            <option value="WAEC">WAEC</option>
            <option value="NECO">NECO</option>
            <option value="UTME">UTME</option>
            <option value="POST_UTME">Post-UTME</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Subject</label>
          <select name="subjectId" defaultValue={initial?.subjectId ?? ""} required className={inputClass}>
            <option value="" disabled>
              Select a subject
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Passage type</label>
          <select name="type" defaultValue={initial?.type ?? "COMPREHENSION"} className={inputClass}>
            {PASSAGE_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Title (optional)</label>
          <input name="title" defaultValue={initial?.title ?? ""} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Instructions shown to the student (optional)</label>
        <input
          name="instructions"
          defaultValue={initial?.instructions ?? ""}
          placeholder="Read the passage carefully and answer the questions that follow."
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="showLineNumbers"
            checked={showLineNumbers}
            onChange={(e) => setShowLineNumbers(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950"
          />
          Show line numbers
        </label>
        {showLineNumbers && (
          <div>
            <label className={labelClass}>Starting line number</label>
            <input
              name="startingLineNumber"
              type="number"
              min={1}
              defaultValue={initial?.startingLineNumber ?? 1}
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Passage text — one line per row (line numbers, if enabled, count non-blank lines)
          </label>
          <textarea
            name="bodyText"
            required
            rows={16}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className={`${inputClass} font-mono leading-7`}
          />
        </div>
        <div>
          <label className={labelClass}>Live preview</label>
          <div className="mt-1 min-h-[24rem] rounded-lg border border-slate-800 bg-slate-900 p-3">
            {bodyText.trim() ? (
              <MessageContent content={bodyText} />
            ) : (
              <p className="text-xs text-slate-600">Preview appears here.</p>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
      >
        {initial?.id ? "Save changes" : "Create draft"}
      </button>
    </form>
  );
}
