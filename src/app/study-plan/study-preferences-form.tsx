import type { StudyDayOfWeek, StudyPeriod } from "@prisma/client";
import { saveStudyPreferencesAction } from "@/app/study-plan/actions";

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

export function StudyPreferencesForm({
  current,
}: {
  current: { dailyStudyMinutes: number | null; studyDays: StudyDayOfWeek[]; preferredStudyPeriod: StudyPeriod | null };
}) {
  const isCustom =
    !!current.dailyStudyMinutes && !["30", "60", "120", "180"].includes(String(current.dailyStudyMinutes));

  return (
    <form action={saveStudyPreferencesAction} className="space-y-5">
      <div>
        <p className="text-sm font-medium text-text-primary">How much time can you study each day?</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {dailyMinutesOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-center text-sm font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
            >
              <input
                type="radio"
                name="dailyStudyMinutes"
                value={option.value}
                defaultChecked={
                  option.value === "custom" ? isCustom : current.dailyStudyMinutes === Number(option.value)
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
          defaultValue={isCustom ? current.dailyStudyMinutes! : ""}
          className="mt-2 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-text-primary">Which days do you normally study?</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {studyDayOptions.map((day) => (
            <label
              key={day.value}
              className="flex cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-surface-raised px-2 py-2 text-center text-xs font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
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
              className="flex cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-surface-raised px-2 py-2 text-center text-xs font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
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

      <button type="submit" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
        Create My Study Plan
      </button>
    </form>
  );
}
