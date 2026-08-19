"use client";

import { useState } from "react";
import { MessageContent } from "@/components/ai-coach/message-content";

type OptionKey = "A" | "B" | "C" | "D" | "E";
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D", "E"];

export type QuestionFormValue = {
  id?: string;
  exam: string;
  subjectId: string;
  topic: string | null;
  subtopic: string | null;
  grade: string | null;
  year: number | null;
  difficulty: string;
  prompt: string;
  imageUrl: string | null;
  options: { key: string; text: string }[];
  correctOption: string;
  explanation: string | null;
  sourceType: string;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500";
const labelClass = "block text-xs text-slate-400";

export function QuestionForm({
  action,
  subjects,
  initial,
}: {
  action: (formData: FormData) => void;
  subjects: { id: string; name: string }[];
  initial?: QuestionFormValue;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const optionByKey = new Map(initial?.options.map((o) => [o.key, o.text]));

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
          <label className={labelClass}>Topic</label>
          <input name="topic" defaultValue={initial?.topic ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Subtopic</label>
          <input name="subtopic" defaultValue={initial?.subtopic ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Grade / class</label>
          <input name="grade" defaultValue={initial?.grade ?? ""} placeholder="SS3" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Year</label>
          <input
            name="year"
            type="number"
            defaultValue={initial?.year ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Difficulty</label>
          <select name="difficulty" defaultValue={initial?.difficulty ?? "MEDIUM"} className={inputClass}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Source type</label>
          <select
            name="sourceType"
            defaultValue={initial?.sourceType ?? "ORIGINAL_SMARTPREP_QUESTION"}
            className={inputClass}
          >
            <option value="OFFICIAL_PAST_QUESTION">Official past question</option>
            <option value="LICENSED_QUESTION">Licensed question</option>
            <option value="ORIGINAL_SMARTPREP_QUESTION">Original SmartPrepAfrica question</option>
            <option value="TEACHER_CREATED">Teacher-created</option>
            <option value="AI_GENERATED">AI-generated</option>
            <option value="IMPORTED">Imported</option>
          </select>
          <p className="mt-1 text-[11px] text-amber-400/80">
            Never label a question &quot;Official past question&quot; unless it genuinely is one.
          </p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Image URL (optional)</label>
        <input name="imageUrl" defaultValue={initial?.imageUrl ?? ""} className={inputClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Question text — Markdown + LaTeX supported (e.g. <code>$x^2$</code>)
          </label>
          <textarea
            name="prompt"
            required
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Live preview</label>
          <div className="mt-1 min-h-[9.5rem] rounded-lg border border-slate-800 bg-slate-900 p-3">
            {prompt.trim() ? (
              <MessageContent content={prompt} />
            ) : (
              <p className="text-xs text-slate-600">Preview appears here.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Answer options (leave blank to omit — at least two required)</label>
        <div className="mt-1 space-y-2">
          {OPTION_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-5 text-xs font-mono text-slate-500">{key}</span>
              <input name={`option_${key}`} defaultValue={optionByKey.get(key) ?? ""} className={inputClass} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Correct answer</label>
        <select name="correctOption" defaultValue={initial?.correctOption ?? "A"} className={inputClass}>
          {OPTION_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Explanation (optional) — Markdown + LaTeX supported</label>
        <textarea
          name="explanation"
          rows={4}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className={inputClass}
        />
        {explanation.trim() && (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
            <MessageContent content={explanation} />
          </div>
        )}
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
