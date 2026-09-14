/** Purely informational (brief §13) — never gates access. Six equally-
 * weighted checks matching the fields the profile page actually lets a
 * student edit. */
export type ProfileCompletionInput = {
  gradeLevel: string | null;
  academicTrack: string | null;
  subjectCount: number;
  targetExamCount: number;
  studyGoal: string | null;
  dailyStudyMinutes: number | null;
  studyDayCount: number;
};

export type ProfileCompletionResult = {
  pct: number;
  missing: string[];
};

export function computeProfileCompletion(input: ProfileCompletionInput): ProfileCompletionResult {
  const checks: { label: string; done: boolean }[] = [
    { label: "Class level", done: !!input.gradeLevel },
    { label: "Academic track", done: !!input.academicTrack },
    { label: "Subjects", done: input.subjectCount > 0 },
    { label: "Target exam", done: input.targetExamCount > 0 },
    { label: "Study goal", done: !!input.studyGoal },
    { label: "Study availability", done: !!input.dailyStudyMinutes && input.studyDayCount > 0 },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  return {
    pct: Math.round((doneCount / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
}
