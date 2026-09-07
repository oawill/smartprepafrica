"use client";

import { useState } from "react";
import type { SatSection } from "@prisma/client";

type OptionKey = "A" | "B" | "C" | "D";
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

const DOMAIN_SUGGESTIONS: Record<SatSection, string[]> = {
  READING_WRITING: ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"],
  MATH: ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"],
};

export type SatContentFormValue = {
  id?: string;
  section: SatSection;
  domain: string;
  skill: string | null;
  questionType: string;
  difficulty: string;
  passage: string | null;
  prompt: string;
  options: { key: string; text: string }[] | null;
  correctOption: string | null;
  correctValue: string | null;
  explanation: string | null;
  estimatedTimeSec: number | null;
  tags: string[];
  sourceReference?: string | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export function SatContentForm({
  action,
  initial,
}: {
  action: (formData: FormData) => void;
  initial?: SatContentFormValue;
}) {
  const [section, setSection] = useState<SatSection>(initial?.section ?? "READING_WRITING");
  const [questionType, setQuestionType] = useState(initial?.questionType ?? "MULTIPLE_CHOICE");
  const isMcq = questionType === "MULTIPLE_CHOICE";
  const optionByKey = new Map((initial?.options ?? []).map((o) => [o.key, o.text]));

  return (
    <form action={action} className="space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Section</label>
          <select
            name="section"
            value={section}
            onChange={(e) => setSection(e.target.value as SatSection)}
            className={inputClass}
          >
            <option value="READING_WRITING">Reading and Writing</option>
            <option value="MATH">Math</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Domain</label>
          <input
            name="domain"
            list="sat-domain-suggestions"
            defaultValue={initial?.domain ?? ""}
            placeholder="e.g. Algebra"
            required
            className={inputClass}
          />
          <datalist id="sat-domain-suggestions">
            {DOMAIN_SUGGESTIONS[section].map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>Skill (optional)</label>
          <input name="skill" defaultValue={initial?.skill ?? ""} placeholder="e.g. Transitions" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Question type</label>
          <select
            name="questionType"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className={inputClass}
          >
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="STUDENT_PRODUCED_RESPONSE">Student-produced response (numeric)</option>
          </select>
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
          <label className={labelClass}>Estimated time (seconds, optional)</label>
          <input
            name="estimatedTimeSec"
            type="number"
            min={0}
            defaultValue={initial?.estimatedTimeSec ?? ""}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Tags (comma-separated, optional)</label>
          <input name="tags" defaultValue={initial?.tags.join(", ") ?? ""} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Passage (optional — short Reading and Writing text)</label>
        <textarea name="passage" rows={6} defaultValue={initial?.passage ?? ""} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Prompt / question (LaTeX supported, e.g. $x^2$)</label>
        <textarea name="prompt" required rows={5} defaultValue={initial?.prompt ?? ""} className={inputClass} />
      </div>

      {isMcq ? (
        <>
          <div>
            <label className={labelClass}>Answer options (at least two required, LaTeX supported)</label>
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
        </>
      ) : (
        <div>
          <label className={labelClass}>Correct numeric value (exact-match after trim)</label>
          <input name="correctValue" defaultValue={initial?.correctValue ?? ""} required className={inputClass} />
        </div>
      )}

      <div>
        <label className={labelClass}>Explanation (optional, shown after the student answers)</label>
        <textarea name="explanation" rows={3} defaultValue={initial?.explanation ?? ""} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Source / Reference (optional)</label>
        <input
          name="sourceReference"
          defaultValue={initial?.sourceReference ?? ""}
          placeholder="e.g. SmartPrepAfrica original, or a licensed source citation"
          className={inputClass}
        />
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
