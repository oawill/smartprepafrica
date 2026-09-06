"use client";

import { useState } from "react";
import type { ToeflSkill } from "@prisma/client";

type OptionKey = "A" | "B" | "C" | "D";
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

const TASK_TYPE_SUGGESTIONS = ["READING_MCQ", "LISTENING_MCQ", "WRITING_INDEPENDENT", "SPEAKING_INDEPENDENT"];

export type ToeflContentFormValue = {
  id?: string;
  skill: ToeflSkill;
  taskType: string;
  difficulty: string;
  prompt: string;
  passage: string | null;
  audioUrl: string | null;
  audioDurationSec: number | null;
  transcript: string | null;
  options: { key: string; text: string }[] | null;
  correctOption: string | null;
  explanation: string | null;
  estimatedTimeSec: number | null;
  tags: string[];
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export function ToeflContentForm({
  action,
  initial,
}: {
  action: (formData: FormData) => void;
  initial?: ToeflContentFormValue;
}) {
  const [skill, setSkill] = useState<ToeflSkill>(initial?.skill ?? "READING");
  const isMcq = skill === "READING" || skill === "LISTENING";
  const optionByKey = new Map((initial?.options ?? []).map((o) => [o.key, o.text]));

  return (
    <form action={action} className="space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Skill</label>
          <select
            name="skill"
            value={skill}
            onChange={(e) => setSkill(e.target.value as ToeflSkill)}
            className={inputClass}
          >
            <option value="READING">Reading</option>
            <option value="LISTENING">Listening</option>
            <option value="WRITING">Writing</option>
            <option value="SPEAKING">Speaking</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Task type</label>
          <input
            name="taskType"
            list="toefl-task-type-suggestions"
            defaultValue={initial?.taskType ?? ""}
            placeholder="e.g. READING_MCQ"
            required
            className={inputClass}
          />
          <datalist id="toefl-task-type-suggestions">
            {TASK_TYPE_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
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

      {skill === "READING" && (
        <div>
          <label className={labelClass}>Passage</label>
          <textarea name="passage" rows={8} required defaultValue={initial?.passage ?? ""} className={inputClass} />
        </div>
      )}

      {skill === "LISTENING" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Audio URL</label>
            <input name="audioUrl" required defaultValue={initial?.audioUrl ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Audio duration (seconds, optional)</label>
            <input
              name="audioDurationSec"
              type="number"
              min={0}
              step="0.1"
              defaultValue={initial?.audioDurationSec ?? ""}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Transcript (never shown to students during practice)</label>
            <textarea name="transcript" rows={6} defaultValue={initial?.transcript ?? ""} className={inputClass} />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Prompt / question</label>
        <textarea name="prompt" required rows={5} defaultValue={initial?.prompt ?? ""} className={inputClass} />
      </div>

      {isMcq && (
        <>
          <div>
            <label className={labelClass}>Answer options (at least two required)</label>
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
            <label className={labelClass}>Explanation (optional, shown after the student answers)</label>
            <textarea name="explanation" rows={3} defaultValue={initial?.explanation ?? ""} className={inputClass} />
          </div>
        </>
      )}

      <button
        type="submit"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
      >
        {initial?.id ? "Save changes" : "Create draft"}
      </button>
    </form>
  );
}
