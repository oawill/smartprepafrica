"use client";

import { useState } from "react";
import type { ExamType } from "@prisma/client";
import type { ExamDrillConfigValues } from "@/lib/practice/exam-drill-config";
import type { ExamReadiness } from "@/lib/practice/readiness-service";
import { startQuickDrill, startFullMock, startSmartMixedDrill } from "@/app/practice/drills/actions";

type SubjectOption = { id: string; name: string };

const BROAD_PRESETS = [
  {
    purpose: "PRACTICE_SESSION" as const,
    title: "Practice Session",
    sizeKey: "practiceSessionSize" as const,
    description: "A regular study session with broader coverage.",
  },
  {
    purpose: "CHALLENGE" as const,
    title: "Challenge",
    sizeKey: "challengeSize" as const,
    description: "More intensive practice, skewed toward harder questions.",
  },
];

/** The Quick Drill picker — sizes always come from the exam's
 * ExamDrillConfig (admin-configurable), never hardcoded here. Subjects are
 * always the student's selected subjects (StudentExamProfile), never the
 * full catalog. Topic Drill itself isn't offered as a generic preset here
 * (it needs a specific topic, launched instead from the Topic Mastery
 * drill-down via startTopicDrill/startWeakAreasDrill). */
export function QuickDrillSelector({
  exam,
  subjects,
  config,
  readiness,
}: {
  exam: ExamType;
  subjects: SubjectOption[];
  config: ExamDrillConfigValues;
  readiness: ExamReadiness;
}) {
  const [quickCheckSubject, setQuickCheckSubject] = useState(subjects[0]?.id ?? "");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form action={startQuickDrill} className="rounded-xl border border-border bg-surface-raised p-5">
        <input type="hidden" name="exam" value={exam} />
        <input type="hidden" name="purpose" value="QUICK_CHECK" />
        <input type="hidden" name="subjects" value={quickCheckSubject} />
        <p className="font-semibold text-text-primary">Quick Check</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-text">
          {config.quickCheckSize} Questions
        </p>
        <p className="mt-2 text-sm text-text-secondary">A fast knowledge check on one subject.</p>
        <label className="mt-3 block text-xs font-medium text-text-secondary">
          Choose Subject
          <select
            value={quickCheckSubject}
            onChange={(e) => setQuickCheckSubject(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!quickCheckSubject}
          className="mt-4 w-full rounded-full bg-brand py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Quick Check
        </button>
      </form>

      {BROAD_PRESETS.map((preset) => (
        <form key={preset.purpose} action={startQuickDrill} className="rounded-xl border border-border bg-surface-raised p-5">
          <input type="hidden" name="exam" value={exam} />
          <input type="hidden" name="purpose" value={preset.purpose} />
          {subjects.map((s) => (
            <input key={s.id} type="hidden" name="subjects" value={s.id} />
          ))}
          <p className="font-semibold text-text-primary">{preset.title}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-text">
            {config[preset.sizeKey]} Questions
          </p>
          <p className="mt-2 text-sm text-text-secondary">{preset.description}</p>
          <button
            type="submit"
            disabled={subjects.length === 0}
            className="mt-4 w-full rounded-full bg-brand py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start {preset.title}
          </button>
        </form>
      ))}

      <form action={startSmartMixedDrill} className="rounded-xl border border-brand/30 bg-brand/5 p-5">
        <input type="hidden" name="exam" value={exam} />
        {subjects.map((s) => (
          <input key={s.id} type="hidden" name="subjects" value={s.id} />
        ))}
        <p className="font-semibold text-text-primary">Smart Mixed Drill</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-text">
          {config.practiceSessionSize} Questions
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Automatically weighted across your subjects — more practice where you need it most, without skipping your
          stronger subjects.
        </p>
        {readiness.overall.readinessPct !== null && (
          <p className="mt-2 text-xs text-text-muted">
            Currently weighted toward your weakest subject{readiness.subjects.length > 1 ? "s" : ""}.
          </p>
        )}
        <button
          type="submit"
          disabled={subjects.length === 0}
          className="mt-4 w-full rounded-full bg-brand py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Smart Mixed Drill
        </button>
      </form>

      <form action={startFullMock} className="rounded-xl border border-brand/30 bg-brand/5 p-5">
        <input type="hidden" name="exam" value={exam} />
        {subjects.slice(0, config.fullMockSubjectCount).map((s) => (
          <input key={s.id} type="hidden" name="subjects" value={s.id} />
        ))}
        <p className="font-semibold text-text-primary">Full Mock</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-text">Exam Simulation</p>
        <p className="mt-2 text-sm text-text-secondary">
          {config.fullMockSubjectCount} subjects · {config.fullMockQuestionsPerSubject} questions each ·{" "}
          {config.fullMockTimeLimitMinutes} minutes
        </p>
        <button
          type="submit"
          disabled={subjects.length === 0}
          className="mt-4 w-full rounded-full bg-brand py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Full Mock
        </button>
      </form>
    </div>
  );
}
