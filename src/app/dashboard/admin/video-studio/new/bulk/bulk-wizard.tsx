"use client";

import { useState, useTransition } from "react";
import { Label, Input } from "@/components/ui/form";
import { createVideoProjectsBulk } from "@/app/dashboard/admin/video-studio/new/bulk-actions";
import type { CurriculumCountry } from "@/app/dashboard/admin/video-studio/new/create-video-wizard";

const VIDEO_TYPES: { value: string; label: string }[] = [
  { value: "FULL_LESSON", label: "Full Lesson" },
  { value: "QUICK_REVISION", label: "Quick Revision" },
  { value: "PAST_QUESTION_WALKTHROUGH", label: "Past Question Walkthrough" },
  { value: "CONCEPT_EXPLAINER", label: "Concept Explainer" },
  { value: "WORKED_EXAMPLE", label: "Worked Example" },
  { value: "PRACTICAL_DEMONSTRATION", label: "Practical Demonstration" },
  { value: "EXAM_TIPS", label: "Exam Tips" },
  { value: "TOPIC_SUMMARY", label: "Topic Summary" },
  { value: "YOUTUBE_SHORT", label: "YouTube Short" },
  { value: "REVISION_SHORT", label: "Revision Short" },
];

const DURATIONS = [
  { value: 60, label: "60 seconds" },
  { value: 180, label: "3 minutes" },
  { value: 300, label: "5 minutes" },
  { value: 480, label: "8 minutes" },
  { value: 600, label: "10 minutes" },
];

const ASPECT_RATIOS = [
  { value: "LANDSCAPE_16_9", label: "16:9 — Standard lesson" },
  { value: "VERTICAL_9_16", label: "9:16 — Shorts" },
  { value: "SQUARE_1_1", label: "1:1 — Social" },
];

const MAX_TOPICS = 100;

export function BulkCreateWizard({ curriculum }: { curriculum: CurriculumCountry[] }) {
  const [countryCode, setCountryCode] = useState(curriculum[0]?.code ?? "");
  const [countryExamId, setCountryExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [videoType, setVideoType] = useState("FULL_LESSON");
  const [duration, setDuration] = useState(480);
  const [aspectRatio, setAspectRatio] = useState("LANDSCAPE_16_9");
  const [topicsRaw, setTopicsRaw] = useState("");
  const [isPending, startTransition] = useTransition();

  const country = curriculum.find((c) => c.code === countryCode);
  const exams = country?.exams ?? [];
  const exam = exams.find((e) => e.countryExamId === countryExamId);
  const subjects = exam?.subjects ?? [];

  const topicCount = new Set(
    topicsRaw
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean),
  ).size;
  const cappedCount = Math.min(topicCount, MAX_TOPICS);
  const canSubmit = !!(countryExamId && subjectId && topicCount > 0);

  return (
    <form
      action={(formData) => startTransition(() => createVideoProjectsBulk(formData))}
      className="mt-6 space-y-5 rounded-xl border border-border bg-surface-raised p-5"
    >
      <div>
        <Label htmlFor="country">Country</Label>
        <select
          id="country"
          value={countryCode}
          onChange={(e) => {
            setCountryCode(e.target.value);
            setCountryExamId("");
            setSubjectId("");
          }}
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
        <Label htmlFor="countryExamId">Exam</Label>
        <select
          id="countryExamId"
          name="countryExamId"
          value={countryExamId}
          onChange={(e) => {
            setCountryExamId(e.target.value);
            setSubjectId("");
          }}
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
        <Label htmlFor="subjectId">Subject</Label>
        <select
          id="subjectId"
          name="subjectId"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
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
        <Label htmlFor="gradeLevel">Class / Level (optional)</Label>
        <Input id="gradeLevel" name="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="e.g. SS3" />
      </div>

      <fieldset>
        <legend className="text-sm text-text-secondary">Video type</legend>
        <select
          name="videoType"
          value={videoType}
          onChange={(e) => setVideoType(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
        >
          {VIDEO_TYPES.map((vt) => (
            <option key={vt.value} value={vt.value}>
              {vt.label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="text-sm text-text-secondary">Length</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <label
              key={d.value}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs ${
                duration === d.value ? "border-brand bg-brand/10 text-brand-text" : "border-border-strong text-text-secondary"
              }`}
            >
              <input type="radio" className="sr-only" checked={duration === d.value} onChange={() => setDuration(d.value)} />
              {d.label}
            </label>
          ))}
        </div>
        <input type="hidden" name="targetDurationSec" value={duration} />
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
              <input type="radio" className="sr-only" checked={aspectRatio === ar.value} onChange={() => setAspectRatio(ar.value)} />
              {ar.label}
            </label>
          ))}
        </div>
        <input type="hidden" name="aspectRatio" value={aspectRatio} />
      </fieldset>

      <div>
        <Label htmlFor="topicsRaw">Topics — one per line</Label>
        <textarea
          id="topicsRaw"
          name="topicsRaw"
          value={topicsRaw}
          onChange={(e) => setTopicsRaw(e.target.value)}
          rows={10}
          placeholder={"Acids, Bases and Salts\nAtomic Structure\nChemical Bonding"}
          className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
        />
        <p className="mt-1 text-xs text-text-muted">
          {topicCount === 0
            ? "No topics yet."
            : topicCount > MAX_TOPICS
              ? `${topicCount} topics entered — only the first ${MAX_TOPICS} will be created.`
              : `${cappedCount} draft project${cappedCount === 1 ? "" : "s"} will be created.`}
        </p>
      </div>

      <button
        type="submit"
        disabled={!canSubmit || isPending}
        className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
      >
        {isPending ? "Creating…" : `Create ${cappedCount || ""} project${cappedCount === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}
