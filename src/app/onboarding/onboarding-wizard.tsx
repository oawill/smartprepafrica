import Link from "next/link";
import type { AcademicTrack, StudyDayOfWeek, StudyPeriod } from "@prisma/client";
import {
  saveClassLevel,
  saveAcademicTrack,
  saveSubjects,
  saveTargetExams,
  saveWeakSubjects,
  saveStudyGoal,
  completeOnboarding,
} from "@/app/onboarding/actions";

export type OnboardingStep = "class" | "track" | "subjects" | "exams" | "weak-subjects" | "goal" | "availability";

const STEP_META: Record<OnboardingStep, { back: OnboardingStep | null }> = {
  class: { back: null },
  track: { back: "class" },
  subjects: { back: "track" },
  exams: { back: "subjects" },
  "weak-subjects": { back: "exams" },
  goal: { back: "weak-subjects" },
  availability: { back: "goal" },
};

const classOptions = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "Other / Graduated"] as const;

const trackOptions = [
  { value: "SCIENCE", label: "Science", description: "Mathematics, Biology, Chemistry, Physics and related subjects." },
  { value: "ARTS", label: "Arts", description: "Literature, Government, History, Languages and related subjects." },
  { value: "COMMERCIAL", label: "Commercial", description: "Economics, Accounting, Commerce and related subjects." },
  { value: "UNDECIDED", label: "Not sure yet", description: "We'll ask which subjects you currently study instead." },
] as const;

const studyGoalPresets = [
  "Pass my exams",
  "Improve my grades",
  "Prepare for university admission",
  "General learning",
] as const;

const dailyMinutesOptions = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3+ hours" },
  { value: "custom", label: "Custom" },
] as const;

const studyDayOptions: { value: StudyDayOfWeek; label: string }[] = [
  { value: "MONDAY", label: "Mon" },
  { value: "TUESDAY", label: "Tue" },
  { value: "WEDNESDAY", label: "Wed" },
  { value: "THURSDAY", label: "Thu" },
  { value: "FRIDAY", label: "Fri" },
  { value: "SATURDAY", label: "Sat" },
  { value: "SUNDAY", label: "Sun" },
];

const studyPeriodOptions: { value: StudyPeriod; label: string }[] = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "NO_PREFERENCE", label: "No preference" },
];

function ProgressHeader({ stepIndex, totalSteps, back }: { stepIndex: number; totalSteps: number; back: OnboardingStep | null }) {
  return (
    <div className="mb-6">
      {back ? (
        <Link href={`/onboarding?step=${back}`} className="text-sm text-text-secondary hover:text-text-primary">
          ← Back
        </Link>
      ) : (
        <span className="text-sm text-transparent">←</span>
      )}
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
        Step {stepIndex} of {totalSteps}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${(stepIndex / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

const continueButtonClass =
  "w-full rounded-lg bg-brand py-3 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60";

export function OnboardingWizard({
  step,
  stepIndex,
  totalSteps,
  subjects,
  examOptions,
  current,
}: {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  subjects: { id: string; name: string; academicTracks: AcademicTrack[] }[];
  examOptions: { code: string; name: string }[];
  current: {
    gradeLevel: string | null;
    academicTrack: AcademicTrack | null;
    targetSubjectIds: string[];
    examCodes: string[];
    weakSubjectIds: string[];
    studyGoal: string | null;
    dailyStudyMinutes: number | null;
    studyDays: StudyDayOfWeek[];
    preferredStudyPeriod: StudyPeriod | null;
  };
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      <ProgressHeader stepIndex={stepIndex} totalSteps={totalSteps} back={STEP_META[step].back} />

      {step === "class" && (
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">What class are you in?</h1>
          <p className="mt-2 text-sm text-text-secondary">
            This helps us recommend content at the right level for you.
          </p>
          <form action={saveClassLevel} className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {classOptions.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center justify-center rounded-xl border border-border-strong bg-surface-raised px-3 py-4 text-center text-sm font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                >
                  <input
                    type="radio"
                    name="gradeLevel"
                    value={option}
                    defaultChecked={current.gradeLevel === option}
                    required
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
            <button type="submit" className={continueButtonClass}>
              Continue
            </button>
          </form>
        </div>
      )}

      {step === "track" && (
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">What is your study track?</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Tell us which academic track best describes you. We&apos;ll use this to recommend the
            right subjects, lessons, practice questions, and study plans.
          </p>
          <form action={saveAcademicTrack} className="mt-6 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {trackOptions.map((option) => (
                <label
                  key={option.value}
                  className="cursor-pointer rounded-xl border border-border-strong bg-surface-raised p-4 transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                >
                  <input
                    type="radio"
                    name="academicTrack"
                    value={option.value}
                    defaultChecked={current.academicTrack === option.value}
                    required
                    className="sr-only"
                  />
                  <p className="font-semibold text-text-primary">{option.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
                </label>
              ))}
            </div>
            <button type="submit" className={continueButtonClass}>
              Continue
            </button>
          </form>
        </div>
      )}

      {step === "subjects" && (
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">Which subjects do you take?</h1>
          <p className="mt-2 text-sm text-text-secondary">
            We&apos;ve suggested subjects based on your track — add, remove, or pick any subject
            you actually study.
          </p>
          <form action={saveSubjects} className="mt-6 space-y-3">
            <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">
              {subjects.map((subject) => {
                const suggested =
                  current.academicTrack &&
                  current.academicTrack !== "UNDECIDED" &&
                  (subject.academicTracks.length === 0 || subject.academicTracks.includes(current.academicTrack));
                const preChecked =
                  current.targetSubjectIds.length > 0
                    ? current.targetSubjectIds.includes(subject.id)
                    : Boolean(suggested);
                return (
                  <label
                    key={subject.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-sm text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                  >
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={subject.id}
                      defaultChecked={preChecked}
                      className="h-4 w-4 accent-brand"
                    />
                    {subject.name}
                  </label>
                );
              })}
            </div>
            <button type="submit" className={continueButtonClass}>
              Continue
            </button>
          </form>
        </div>
      )}

      {step === "exams" && (
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">Which exam(s) are you preparing for?</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Select all that apply. You can change this anytime from your profile.
          </p>
          <form action={saveTargetExams} className="mt-6 space-y-3">
            {examOptions.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface-raised p-4 text-sm text-text-secondary">
                No exams are configured for your country yet — you can skip this step.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {examOptions.map((exam) => (
                  <label
                    key={exam.code}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-3 text-sm font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                  >
                    <input
                      type="checkbox"
                      name="examCodes"
                      value={exam.code}
                      defaultChecked={current.examCodes.includes(exam.code)}
                      className="h-4 w-4 accent-brand"
                    />
                    {exam.name}
                  </label>
                ))}
              </div>
            )}
            <button type="submit" className={continueButtonClass}>
              Continue
            </button>
          </form>
        </div>
      )}

      {step === "weak-subjects" && (
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">Any subjects you find difficult?</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Optional — we&apos;ll prioritize these in your recommendations. You can pick from the
            subjects you selected earlier.
          </p>
          <form action={saveWeakSubjects} className="mt-6 space-y-3">
            {subjects.filter((s) => current.targetSubjectIds.includes(s.id)).length === 0 ? (
              <p className="rounded-lg border border-border bg-surface-raised p-4 text-sm text-text-secondary">
                No subjects selected in the previous step yet.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {subjects
                  .filter((s) => current.targetSubjectIds.includes(s.id))
                  .map((subject) => (
                    <label
                      key={subject.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-sm text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                    >
                      <input
                        type="checkbox"
                        name="weakSubjectIds"
                        value={subject.id}
                        defaultChecked={current.weakSubjectIds.includes(subject.id)}
                        className="h-4 w-4 accent-brand"
                      />
                      {subject.name}
                    </label>
                  ))}
              </div>
            )}
            <button type="submit" className={continueButtonClass}>
              Continue
            </button>
          </form>
        </div>
      )}

      {step === "goal" && (
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">What&apos;s your main study goal?</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Pick the option that fits best, or write your own.
          </p>
          <form action={saveStudyGoal} className="mt-6 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {studyGoalPresets.map((preset) => (
                <label
                  key={preset}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-3 text-sm font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                >
                  <input
                    type="radio"
                    name="studyGoalPreset"
                    value={preset}
                    defaultChecked={current.studyGoal === preset}
                    className="h-4 w-4 accent-brand"
                  />
                  {preset}
                </label>
              ))}
            </div>
            <input
              type="text"
              name="studyGoalCustom"
              placeholder="Or write your own goal (optional)"
              defaultValue={current.studyGoal && !studyGoalPresets.includes(current.studyGoal as never) ? current.studyGoal : ""}
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button type="submit" className={continueButtonClass}>
              Continue
            </button>
          </form>
        </div>
      )}

      {step === "availability" && (
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">How much time can you study each day?</h1>
          <p className="mt-2 text-sm text-text-secondary">
            We&apos;ll use this to build your personalized weekly study plan.
          </p>
          <form action={completeOnboarding} className="mt-6 space-y-5">
            <div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {dailyMinutesOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-surface-raised px-3 py-3 text-center text-sm font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                  >
                    <input
                      type="radio"
                      name="dailyStudyMinutes"
                      value={option.value}
                      defaultChecked={
                        option.value === "custom"
                          ? !!current.dailyStudyMinutes &&
                            !["30", "60", "120", "180"].includes(String(current.dailyStudyMinutes))
                          : current.dailyStudyMinutes === Number(option.value)
                      }
                      required
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <input
                type="number"
                name="customMinutes"
                min={5}
                max={600}
                placeholder="Custom minutes per day"
                defaultValue={
                  current.dailyStudyMinutes && !["30", "60", "120", "180"].includes(String(current.dailyStudyMinutes))
                    ? current.dailyStudyMinutes
                    : ""
                }
                className="mt-2 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-text-primary">Which days do you normally study?</p>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {studyDayOptions.map((day) => (
                  <label
                    key={day.value}
                    className="flex cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-surface-raised px-2 py-2.5 text-center text-xs font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                  >
                    <input
                      type="checkbox"
                      name="studyDays"
                      value={day.value}
                      defaultChecked={current.studyDays.includes(day.value)}
                      className="sr-only"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-text-primary">
                What time do you prefer to study? <span className="text-text-muted">(optional)</span>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {studyPeriodOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-surface-raised px-2 py-2.5 text-center text-xs font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                  >
                    <input
                      type="radio"
                      name="preferredStudyPeriod"
                      value={option.value}
                      defaultChecked={current.preferredStudyPeriod === option.value}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className={continueButtonClass}>
              Finish Setup
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
