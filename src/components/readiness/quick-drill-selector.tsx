import type { ExamType } from "@prisma/client";
import type { ExamDrillConfigValues } from "@/lib/practice/exam-drill-config";
import { startQuickDrill, startFullMock } from "@/app/practice/drills/actions";

type SubjectOption = { id: string; name: string };

const PRESETS = [
  {
    purpose: "QUICK_CHECK" as const,
    title: "Quick Check",
    sizeKey: "quickCheckSize" as const,
    description: "A fast knowledge check across your subjects.",
  },
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
 * ExamDrillConfig (admin-configurable), never hardcoded here. Topic Drill
 * itself isn't offered as a generic preset here (it needs a specific
 * topic, launched instead from the Topic Mastery drill-down via
 * startTopicDrill) — this selector covers Quick Check/Practice
 * Session/Challenge/Full Mock. */
export function QuickDrillSelector({
  exam,
  subjects,
  config,
}: {
  exam: ExamType;
  subjects: SubjectOption[];
  config: ExamDrillConfigValues;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PRESETS.map((preset) => (
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
