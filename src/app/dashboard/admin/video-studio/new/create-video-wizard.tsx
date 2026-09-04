"use client";

import { useState, useTransition } from "react";
import { Label, Input } from "@/components/ui/form";
import { createVideoProject, suggestObjectivesAction } from "@/app/dashboard/admin/video-studio/new/actions";

export type CurriculumCountry = {
  code: string;
  name: string;
  flag: string;
  exams: {
    countryExamId: string;
    status: string;
    examName: string;
    examBodyName: string;
    subjects: {
      subjectId: string;
      subjectName: string;
      topics: { id: string; name: string }[];
    }[];
  }[];
};

const VIDEO_TYPES: { value: string; label: string; hint: string }[] = [
  { value: "FULL_LESSON", label: "Full Lesson", hint: "Complete topic coverage, 8-10 min typical" },
  { value: "QUICK_REVISION", label: "Quick Revision", hint: "Fast-paced highlights" },
  { value: "PAST_QUESTION_WALKTHROUGH", label: "Past Question Walkthrough", hint: "Step-by-step past questions" },
  { value: "CONCEPT_EXPLAINER", label: "Concept Explainer", hint: "One concept, clearly explained" },
  { value: "WORKED_EXAMPLE", label: "Worked Example", hint: "Calculation/problem walkthrough" },
  { value: "PRACTICAL_DEMONSTRATION", label: "Practical Demonstration", hint: "Lab/practical focus" },
  { value: "EXAM_TIPS", label: "Exam Tips", hint: "Technique and common mistakes" },
  { value: "TOPIC_SUMMARY", label: "Topic Summary", hint: "Concise recap" },
  { value: "YOUTUBE_SHORT", label: "YouTube Short", hint: "Under 60s, vertical" },
  { value: "REVISION_SHORT", label: "Revision Short", hint: "Short punchy clip" },
];

const DURATIONS = [
  { value: 60, label: "60 seconds" },
  { value: 180, label: "3 minutes" },
  { value: 300, label: "5 minutes" },
  { value: 480, label: "8 minutes" },
  { value: 600, label: "10 minutes" },
  { value: 900, label: "15 minutes" },
];

const ASPECT_RATIOS = [
  { value: "LANDSCAPE_16_9", label: "16:9 — Standard lesson" },
  { value: "VERTICAL_9_16", label: "9:16 — Shorts" },
  { value: "SQUARE_1_1", label: "1:1 — Social" },
];

export function CreateVideoWizard({ curriculum }: { curriculum: CurriculumCountry[] }) {
  const [step, setStep] = useState(1);
  const [countryCode, setCountryCode] = useState(curriculum[0]?.code ?? "");
  const [countryExamId, setCountryExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [examTopicId, setExamTopicId] = useState<string | undefined>(undefined);
  const [gradeLevel, setGradeLevel] = useState("");
  const [videoType, setVideoType] = useState("FULL_LESSON");
  const [duration, setDuration] = useState(480);
  const [customDuration, setCustomDuration] = useState("");
  const [aspectRatio, setAspectRatio] = useState("LANDSCAPE_16_9");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [objectiveDraft, setObjectiveDraft] = useState("");
  const [title, setTitle] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const country = curriculum.find((c) => c.code === countryCode);
  const exams = country?.exams ?? [];
  const exam = exams.find((e) => e.countryExamId === countryExamId);
  const subjects = exam?.subjects ?? [];
  const subject = subjects.find((s) => s.subjectId === subjectId);
  const topics = subject?.topics ?? [];
  const examLabel = exam ? `${exam.examName} (${exam.examBodyName})` : "";

  function selectCountry(code: string) {
    setCountryCode(code);
    setCountryExamId("");
    setSubjectId("");
    setTopic("");
    setExamTopicId(undefined);
  }
  function selectExam(id: string) {
    setCountryExamId(id);
    setSubjectId("");
    setTopic("");
    setExamTopicId(undefined);
  }
  function selectSubject(id: string) {
    setSubjectId(id);
    setTopic("");
    setExamTopicId(undefined);
  }
  function selectTopic(name: string, id: string | undefined) {
    setTopic(name);
    setExamTopicId(id);
    if (!title) setTitle(`${name} Explained`);
  }

  function addObjective() {
    const v = objectiveDraft.trim();
    if (!v) return;
    setObjectives((prev) => [...prev, v]);
    setObjectiveDraft("");
  }
  function removeObjective(i: number) {
    setObjectives((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function generateObjectives() {
    if (!subject || !topic) return;
    setSuggesting(true);
    setSuggestError(null);
    const result = await suggestObjectivesAction({ subjectName: subject.subjectName, topic, examLabel });
    setSuggesting(false);
    if (result.ok) {
      setObjectives((prev) => [...prev, ...result.objectives]);
    } else {
      setSuggestError(result.error);
    }
  }

  const finalDuration = customDuration ? Number(customDuration) : duration;
  const canGoStep2 = !!(countryExamId && subjectId && topic.trim());
  const canSubmit = canGoStep2 && title.trim().length >= 3 && finalDuration > 0;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex gap-1 text-xs text-text-muted">
        {["Curriculum", "Format", "Objectives"].map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 ${step === i + 1 ? "bg-brand/10 text-brand-text" : "border border-border"}`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 rounded-xl border border-border bg-surface-raised p-5">
          <div>
            <Label htmlFor="country">Country</Label>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => selectCountry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              {curriculum.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="exam">Exam</Label>
            <select
              id="exam"
              value={countryExamId}
              onChange={(e) => selectExam(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              <option value="">Select an exam…</option>
              {exams.map((e) => (
                <option key={e.countryExamId} value={e.countryExamId}>
                  {e.examName} ({e.examBodyName}) — {e.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="gradeLevel">Class / Level (optional)</Label>
            <Input
              id="gradeLevel"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="e.g. SS3"
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <select
              id="subject"
              value={subjectId}
              onChange={(e) => selectSubject(e.target.value)}
              disabled={!countryExamId}
              className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand disabled:opacity-50"
            >
              <option value="">{countryExamId ? "Select a subject…" : "Select an exam first"}</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="topic">Topic</Label>
            {topics.length > 0 && (
              <select
                value={examTopicId ?? ""}
                onChange={(e) => {
                  const t = topics.find((t) => t.id === e.target.value);
                  if (t) selectTopic(t.name, t.id);
                }}
                disabled={!subjectId}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand disabled:opacity-50"
              >
                <option value="">Choose an existing topic…</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <Input
              id="topic"
              className="mt-2"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setExamTopicId(undefined);
              }}
              placeholder="Or type a topic, e.g. Acids, Bases and Salts"
              disabled={!subjectId}
            />
          </div>

          <button
            type="button"
            disabled={!canGoStep2}
            onClick={() => setStep(2)}
            className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            Next: Format
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 rounded-xl border border-border bg-surface-raised p-5">
          <div>
            <Label htmlFor="title">Video title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
          </div>

          <fieldset>
            <legend className="text-sm text-text-secondary">Video type</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {VIDEO_TYPES.map((vt) => (
                <label
                  key={vt.value}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                    videoType === vt.value ? "border-brand bg-brand/10" : "border-border-strong hover:border-text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="videoType"
                    className="sr-only"
                    checked={videoType === vt.value}
                    onChange={() => setVideoType(vt.value)}
                  />
                  <span className="block font-medium text-text-primary">{vt.label}</span>
                  <span className="block text-xs text-text-muted">{vt.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm text-text-secondary">Length</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <label
                  key={d.value}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs ${
                    !customDuration && duration === d.value
                      ? "border-brand bg-brand/10 text-brand-text"
                      : "border-border-strong text-text-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    name="duration"
                    className="sr-only"
                    checked={!customDuration && duration === d.value}
                    onChange={() => {
                      setDuration(d.value);
                      setCustomDuration("");
                    }}
                  />
                  {d.label}
                </label>
              ))}
              <Input
                type="number"
                placeholder="Custom (seconds)"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="w-40"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm text-text-secondary">Aspect ratio</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <label
                  key={ar.value}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs ${
                    aspectRatio === ar.value ? "border-brand bg-brand/10 text-brand-text" : "border-border-strong text-text-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    name="aspectRatio"
                    className="sr-only"
                    checked={aspectRatio === ar.value}
                    onChange={() => setAspectRatio(ar.value)}
                  />
                  {ar.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Back
            </button>
            <button
              type="button"
              disabled={title.trim().length < 3}
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              Next: Objectives
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form
          action={(formData) => {
            for (const o of objectives) formData.append("learningObjectives", o);
            startTransition(() => createVideoProject(formData));
          }}
          className="space-y-4 rounded-xl border border-border bg-surface-raised p-5"
        >
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="countryExamId" value={countryExamId} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="topic" value={topic} />
          {examTopicId && <input type="hidden" name="examTopicId" value={examTopicId} />}
          {gradeLevel && <input type="hidden" name="gradeLevel" value={gradeLevel} />}
          <input type="hidden" name="videoType" value={videoType} />
          <input type="hidden" name="aspectRatio" value={aspectRatio} />
          <input type="hidden" name="targetDurationSec" value={finalDuration} />

          <p className="text-sm font-medium text-text-secondary">Learning objectives</p>
          <p className="text-xs text-text-muted">Students should be able to:</p>

          <ul className="space-y-1.5">
            {objectives.map((o, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                <span className="flex-1">{o}</span>
                <button type="button" onClick={() => removeObjective(i)} className="text-xs text-danger hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Input
              value={objectiveDraft}
              onChange={(e) => setObjectiveDraft(e.target.value)}
              placeholder="Add an objective…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addObjective();
                }
              }}
            />
            <button
              type="button"
              onClick={addObjective}
              className="shrink-0 rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
            >
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={generateObjectives}
            disabled={suggesting}
            className="w-full rounded-lg border border-brand/40 px-4 py-2 text-sm text-brand-text hover:border-brand disabled:opacity-50"
          >
            {suggesting ? "Generating…" : "✨ Generate suggested objectives with AI"}
          </button>
          {suggestError && <p className="text-xs text-danger">{suggestError}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
