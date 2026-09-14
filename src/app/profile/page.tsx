import Link from "next/link";
import { redirect } from "next/navigation";
import type { AcademicTrack, StudyDayOfWeek, StudyPeriod } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { ensureStudentProfile } from "@/app/onboarding/actions";
import { EXAM_CODE_TO_EXAM_TYPE, EXAM_TYPE_TO_EXAM_CODE } from "@/lib/exam-type-mapping";
import { examLabels } from "@/lib/exam-slugs";
import { getExamReadiness } from "@/lib/ai/mastery-service";
import { computeProfileCompletion } from "@/lib/profile/completion";
import { SubjectEditor } from "@/app/profile/subject-editor";
import {
  updateName,
  updateClassLevel,
  updateAcademicTrack,
  updateTargetExams,
  updateWeakSubjects,
  updateStudyGoal,
  updateStudyPreferencesAction,
} from "@/app/profile/actions";

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

const TRACK_LABELS: Record<AcademicTrack, string> = {
  SCIENCE: "Science",
  ARTS: "Arts",
  COMMERCIAL: "Commercial",
  UNDECIDED: "Not sure yet",
};

const UPDATED_MESSAGES: Record<string, string> = {
  personal: "Changes saved",
  track: "Changes saved",
  subjects: "Changes saved — this updates your dashboard, recommendations, and future study-plan activities.",
  exams: "Changes saved",
  "weak-subjects": "Changes saved",
  goal: "Changes saved",
  preferences: "Your study preferences changed. We've updated your study plan to match your new schedule.",
};

const inputClass =
  "rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const cardSelectClass =
  "flex cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-center text-sm font-medium text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10";
const checkboxRowClass =
  "flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-sm text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10";
const saveButtonClass =
  "mt-3 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover";
const summaryClass =
  "cursor-pointer rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-text-primary hover:border-border-strong";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; trackChanged?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=%2Fprofile");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  await ensureStudentProfile(session.user.id);

  const [profile, user, { updated, trackChanged }] = await Promise.all([
    prisma.studentProfile.findUniqueOrThrow({
      where: { userId: session.user.id },
      select: {
        gradeLevel: true,
        academicTrack: true,
        targetExams: true,
        targetSubjects: { select: { id: true, name: true } },
        weakSubjects: { select: { id: true, name: true } },
        studyGoal: true,
        dailyStudyMinutes: true,
        studyDays: true,
        preferredStudyPeriod: true,
        onboardingCompleted: true,
        user: { select: { countryId: true } },
      },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { name: true, email: true } }),
    searchParams,
  ]);

  const [subjects, countryExams, readiness] = await Promise.all([
    prisma.subject.findMany({
      select: { id: true, name: true, academicTracks: true },
      orderBy: { name: "asc" },
    }),
    prisma.countryExam.findMany({
      where: { status: "ACTIVE", ...(profile.user.countryId ? { countryId: profile.user.countryId } : {}) },
      select: { exam: { select: { code: true, name: true } } },
      orderBy: { exam: { name: "asc" } },
    }),
    getExamReadiness(session.user.id),
  ]);

  const examOptions = countryExams
    .map((ce) => ({ code: ce.exam.code, name: ce.exam.name }))
    .filter((e) => e.code in EXAM_CODE_TO_EXAM_TYPE)
    .filter((e, i, all) => all.findIndex((x) => x.code === e.code) === i);

  const completion = computeProfileCompletion({
    gradeLevel: profile.gradeLevel,
    academicTrack: profile.academicTrack,
    subjectCount: profile.targetSubjects.length,
    targetExamCount: profile.targetExams.length,
    studyGoal: profile.studyGoal,
    dailyStudyMinutes: profile.dailyStudyMinutes,
    studyDayCount: profile.studyDays.length,
  });

  const isDailyMinutesPreset = ["30", "60", "120", "180"].includes(String(profile.dailyStudyMinutes ?? ""));
  const isGoalPreset = profile.studyGoal ? studyGoalPresets.includes(profile.studyGoal as never) : true;

  // System-detected weak topics, per subject — a fully separate signal
  // from the student's own weakSubjects picks (see brief §6). Never
  // editable here, only shown.
  const systemDetectedBySubject = readiness.filter((r) => r.weakTopics.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-text-primary">My Profile</h1>
          <p className="mt-1 text-sm text-text-secondary">Profile {completion.pct}% complete</p>
        </div>
        <Link href="/dashboard" className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
          ← Dashboard
        </Link>
      </div>

      {!profile.onboardingCompleted && completion.pct < 100 && (
        <p className="mt-3 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm text-brand-text">
          Personalize your learning — complete your academic profile so SmartPrepAfrica can improve your
          recommendations and study plan. Missing: {completion.missing.join(", ")}.
        </p>
      )}

      {updated && UPDATED_MESSAGES[updated] && (
        <p className="mt-3 rounded-lg border border-success/40 bg-success-surface px-4 py-2.5 text-sm text-success">
          {UPDATED_MESSAGES[updated]}
        </p>
      )}

      {trackChanged === "1" && (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning-surface p-4">
          <p className="text-sm text-text-primary">
            Your academic track has changed. Would you like to review your subjects?
          </p>
          <div className="mt-2 flex gap-2">
            <a href="#subjects" className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
              Review Subjects
            </a>
            <Link href="/profile" className="rounded-full border border-border-strong px-4 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Keep My Current Subjects
            </Link>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-muted">Personal Information</h2>
      <div className="mt-2 space-y-3">
        <Card title="Name">
          <form action={updateName} className="flex gap-2">
            <input name="name" defaultValue={user.name} required className={`flex-1 ${inputClass}`} />
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Save
            </button>
          </form>
        </Card>
        <Card title="Email">
          <p className="text-sm text-text-secondary">{user.email}</p>
          <p className="mt-1 text-xs text-text-muted">Email changes aren&apos;t supported yet — contact support if you need to update this.</p>
        </Card>
        <details className="rounded-lg border border-border">
          <summary className={summaryClass}>
            Class / Education Level — {profile.gradeLevel ?? "Not set"}
          </summary>
          <div className="p-4">
            <form action={updateClassLevel}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {classOptions.map((option) => (
                  <label key={option} className={cardSelectClass}>
                    <input type="radio" name="gradeLevel" value={option} defaultChecked={profile.gradeLevel === option} required className="sr-only" />
                    {option}
                  </label>
                ))}
              </div>
              <button type="submit" className={saveButtonClass}>Save Changes</button>
            </form>
          </div>
        </details>
      </div>

      {/* Academic Profile */}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-muted">Academic Profile</h2>
      <div className="mt-2 space-y-3">
        <details className="rounded-lg border border-border" id="track">
          <summary className={summaryClass}>
            Academic Track — {profile.academicTrack ? TRACK_LABELS[profile.academicTrack] : "Not set"}
          </summary>
          <div className="p-4">
            <p className="text-xs text-text-secondary">
              Your academic track helps SmartPrepAfrica personalize subjects, lessons, exam preparation, and study
              recommendations.
            </p>
            <form action={updateAcademicTrack} className="mt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {trackOptions.map((option) => (
                  <label key={option.value} className="cursor-pointer rounded-xl border border-border-strong bg-surface-raised p-4 transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10">
                    <input type="radio" name="academicTrack" value={option.value} defaultChecked={profile.academicTrack === option.value} required className="sr-only" />
                    <p className="font-semibold text-text-primary">{option.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
                  </label>
                ))}
              </div>
              <button type="submit" className={saveButtonClass}>Save Changes</button>
            </form>
          </div>
        </details>

        <details className="rounded-lg border border-border" id="subjects" open={trackChanged === "1"}>
          <summary className={summaryClass}>
            Subjects — {profile.targetSubjects.length} selected
          </summary>
          <div className="p-4">
            <p className="text-xs text-text-secondary">
              Changing subjects updates your dashboard, recommendations, and future study-plan activities.
            </p>
            <div className="mt-3">
              <SubjectEditor
                subjects={subjects}
                currentSubjectIds={profile.targetSubjects.map((s) => s.id)}
                academicTrack={profile.academicTrack}
              />
            </div>
          </div>
        </details>

        <details className="rounded-lg border border-border">
          <summary className={summaryClass}>
            Target Exams — {profile.targetExams.length > 0 ? profile.targetExams.map((e) => examLabels[e]).join(", ") : "Not set"}
          </summary>
          <div className="p-4">
            <p className="text-xs text-text-secondary">
              You can prepare for more than one exam. Removing an exam only stops future recommendations from
              prioritizing it — your past quiz and mock results are never deleted.
            </p>
            <form action={updateTargetExams} className="mt-3">
              {examOptions.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface-raised p-4 text-sm text-text-secondary">
                  No exams are configured for your country yet.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {examOptions.map((exam) => (
                    <label key={exam.code} className={checkboxRowClass}>
                      <input
                        type="checkbox"
                        name="examCodes"
                        value={exam.code}
                        defaultChecked={profile.targetExams.map((e) => EXAM_TYPE_TO_EXAM_CODE[e]).includes(exam.code)}
                        className="h-4 w-4 accent-brand"
                      />
                      {exam.name}
                    </label>
                  ))}
                </div>
              )}
              <button type="submit" className={saveButtonClass}>Save Changes</button>
            </form>
          </div>
        </details>

        <details className="rounded-lg border border-border">
          <summary className={summaryClass}>
            Focus Areas — {profile.weakSubjects.length > 0 ? profile.weakSubjects.map((s) => s.name).join(", ") : "None set"}
          </summary>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">You asked for extra help with</p>
              <form action={updateWeakSubjects} className="mt-2">
                {profile.targetSubjects.length === 0 ? (
                  <p className="rounded-lg border border-border bg-surface-raised p-4 text-sm text-text-secondary">
                    Select subjects above first.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {profile.targetSubjects.map((subject) => (
                      <label key={subject.id} className={checkboxRowClass}>
                        <input
                          type="checkbox"
                          name="weakSubjectIds"
                          value={subject.id}
                          defaultChecked={profile.weakSubjects.some((w) => w.id === subject.id)}
                          className="h-4 w-4 accent-brand"
                        />
                        {subject.name}
                      </label>
                    ))}
                  </div>
                )}
                <button type="submit" className={saveButtonClass}>Save Changes</button>
              </form>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">SmartPrepAfrica has detected</p>
              {systemDetectedBySubject.length === 0 ? (
                <p className="mt-2 text-sm text-text-secondary">
                  Not enough practice history yet to detect weak topics automatically.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {systemDetectedBySubject.map((r) => (
                    <li key={r.subjectName} className="text-text-secondary">
                      <span className="font-medium text-text-primary">{r.subjectName}</span> — {r.weakTopics.join(", ")}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-text-muted">
                Based on your actual quiz and drill performance — this is separate from your own picks above and is
                never overwritten by them.
              </p>
            </div>
          </div>
        </details>
      </div>

      {/* Study Preferences */}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-muted">Study Preferences</h2>
      <div className="mt-2 space-y-3">
        <details className="rounded-lg border border-border">
          <summary className={summaryClass}>
            Study Schedule — {profile.dailyStudyMinutes ? `${profile.dailyStudyMinutes} min/day` : "Not set"}
          </summary>
          <div className="p-4">
            <p className="text-xs text-text-secondary">
              Your remaining weekly study sessions will be adjusted to fit any new schedule — sessions you&apos;ve
              already completed are never lost.
            </p>
            <form action={updateStudyPreferencesAction} className="mt-3 space-y-5">
              <div>
                <p className="text-sm font-medium text-text-primary">How much time can you study each day?</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {dailyMinutesOptions.map((option) => (
                    <label key={option.value} className={cardSelectClass}>
                      <input
                        type="radio"
                        name="dailyStudyMinutes"
                        value={option.value}
                        defaultChecked={option.value === "custom" ? !!profile.dailyStudyMinutes && !isDailyMinutesPreset : profile.dailyStudyMinutes === Number(option.value)}
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
                  defaultValue={profile.dailyStudyMinutes && !isDailyMinutesPreset ? profile.dailyStudyMinutes : ""}
                  className={`mt-2 w-full ${inputClass}`}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-text-primary">Which days do you normally study?</p>
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {studyDayOptions.map((day) => (
                    <label key={day.value} className={`${cardSelectClass} px-2 py-2 text-xs`}>
                      <input type="checkbox" name="studyDays" value={day.value} defaultChecked={profile.studyDays.includes(day.value)} className="sr-only" />
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
                    <label key={option.value} className={`${cardSelectClass} px-2 py-2 text-xs`}>
                      <input type="radio" name="preferredStudyPeriod" value={option.value} defaultChecked={profile.preferredStudyPeriod === option.value} className="sr-only" />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className={saveButtonClass}>Save Changes</button>
            </form>
          </div>
        </details>

        <details className="rounded-lg border border-border">
          <summary className={summaryClass}>
            Study Goal — {profile.studyGoal ?? "Not set"}
          </summary>
          <div className="p-4">
            <form action={updateStudyGoal}>
              <div className="grid gap-2 sm:grid-cols-2">
                {studyGoalPresets.map((preset) => (
                  <label key={preset} className={checkboxRowClass}>
                    <input type="radio" name="studyGoalPreset" value={preset} defaultChecked={profile.studyGoal === preset} className="h-4 w-4 accent-brand" />
                    {preset}
                  </label>
                ))}
              </div>
              <input
                type="text"
                name="studyGoalCustom"
                placeholder="Or write your own goal (optional)"
                defaultValue={profile.studyGoal && !isGoalPreset ? profile.studyGoal : ""}
                className={`mt-2 w-full ${inputClass}`}
              />
              <button type="submit" className={saveButtonClass}>Save Changes</button>
            </form>
          </div>
        </details>
      </div>

      {/* Account */}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-muted">Account</h2>
      <div className="mt-2">
        <Card title="Account">
          <p className="text-sm text-text-secondary">{user.name}</p>
          <p className="text-sm text-text-secondary">{user.email}</p>
          <Link href="/api/auth/signout" className="mt-3 inline-block text-sm text-danger hover:underline">
            Sign out
          </Link>
        </Card>
      </div>
    </div>
  );
}
