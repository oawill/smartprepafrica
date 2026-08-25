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
  passageGroupId?: string | null;
  passageLineRef?: string | null;
  passageLineStart?: number | null;
  passageLineEnd?: number | null;
};

export type PassageOption = { id: string; code: string | null; title: string | null; exam: string; subjectId: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export function QuestionForm({
  action,
  subjects,
  passages = [],
  initial,
}: {
  action: (formData: FormData) => void;
  subjects: { id: string; name: string }[];
  passages?: PassageOption[];
  initial?: QuestionFormValue;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [exam, setExam] = useState(initial?.exam ?? "WAEC");
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? "");
  const [isPassageBased, setIsPassageBased] = useState(!!initial?.passageGroupId);
  const optionByKey = new Map(initial?.options.map((o) => [o.key, o.text]));

  const matchingPassages = passages.filter((p) => p.exam === exam && p.subjectId === subjectId);

  return (
    <form action={action} className="space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label className={labelClass}>Question type</label>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setIsPassageBased(false)}
            className={`rounded-lg border px-4 py-2 text-sm ${
              !isPassageBased ? "border-brand bg-brand/10 text-text-primary" : "border-border-strong text-text-secondary"
            }`}
          >
            Standalone
          </button>
          <button
            type="button"
            onClick={() => setIsPassageBased(true)}
            className={`rounded-lg border px-4 py-2 text-sm ${
              isPassageBased ? "border-brand bg-brand/10 text-text-primary" : "border-border-strong text-text-secondary"
            }`}
          >
            Passage-Based
          </button>
        </div>
      </div>

      {isPassageBased && (
        <div className="rounded-lg border border-border bg-surface-raised p-4">
          <div>
            <label className={labelClass}>Passage / source (must match the exam &amp; subject above)</label>
            <select name="passageGroupId" defaultValue={initial?.passageGroupId ?? ""} required={isPassageBased} className={inputClass}>
              <option value="" disabled>
                Select a passage
              </option>
              {matchingPassages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title ?? p.code ?? p.id}
                </option>
              ))}
            </select>
            {matchingPassages.length === 0 && (
              <p className="mt-1 text-[11px] text-warning">
                No passages exist yet for this exam &amp; subject — create one under Admin → Passages first.
              </p>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Line/section reference (optional)</label>
              <input
                name="passageLineRef"
                defaultValue={initial?.passageLineRef ?? ""}
                placeholder="Stanza 2 / Act I, Scene 1"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Start line (optional)</label>
              <input name="passageLineStart" type="number" min={1} defaultValue={initial?.passageLineStart ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>End line (optional)</label>
              <input name="passageLineEnd" type="number" min={1} defaultValue={initial?.passageLineEnd ?? ""} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Exam</label>
          <select
            name="exam"
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            className={inputClass}
          >
            <option value="WAEC">WAEC</option>
            <option value="NECO">NECO</option>
            <option value="UTME">UTME</option>
            <option value="POST_UTME">Post-UTME</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Subject</label>
          <select
            name="subjectId"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            className={inputClass}
          >
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
          <p className="mt-1 text-[11px] text-warning">
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
          <div className="mt-1 min-h-[9.5rem] rounded-lg border border-border bg-surface-raised p-3">
            {prompt.trim() ? (
              <MessageContent content={prompt} />
            ) : (
              <p className="text-xs text-text-muted">Preview appears here.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Answer options (leave blank to omit — at least two required)</label>
        <div className="mt-1 space-y-2">
          {OPTION_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-5 text-xs font-mono text-text-muted">{key}</span>
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
          <div className="mt-2 rounded-lg border border-border bg-surface-raised p-3">
            <MessageContent content={explanation} />
          </div>
        )}
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
      >
        {initial?.id ? "Save changes" : "Create draft"}
      </button>
    </form>
  );
}
