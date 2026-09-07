import Link from "next/link";
import type { ExamType } from "@prisma/client";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { examLabels } from "@/lib/exam-slugs";
import { getDrillConfig } from "@/lib/practice/exam-drill-config";
import { Card } from "@/components/dashboard/card";
import { updateExamDrillConfig } from "@/app/dashboard/admin/readiness/settings/actions";

const ALL_EXAMS: ExamType[] = ["WAEC", "NECO", "UTME", "POST_UTME"];

const FIELDS: { key: keyof Awaited<ReturnType<typeof getDrillConfig>>; label: string; suffix: string }[] = [
  { key: "quickCheckSize", label: "Quick Check size", suffix: "questions" },
  { key: "topicDrillSize", label: "Topic Drill size", suffix: "questions" },
  { key: "practiceSessionSize", label: "Practice Session size", suffix: "questions" },
  { key: "challengeSize", label: "Challenge size", suffix: "questions" },
  { key: "fullMockSubjectCount", label: "Full Mock subject count", suffix: "subjects" },
  { key: "fullMockQuestionsPerSubject", label: "Full Mock questions per subject", suffix: "questions" },
  { key: "fullMockTimeLimitMinutes", label: "Full Mock time limit", suffix: "minutes" },
  { key: "minTopicsForReadiness", label: "Minimum topics before readiness is calculated", suffix: "topics" },
];

export default async function ReadinessSettingsPage() {
  await requireAdminPagePermission("readiness.manage");

  const configs = await Promise.all(ALL_EXAMS.map(async (exam) => ({ exam, config: await getDrillConfig(exam) })));

  return (
    <div>
      <Link href="/dashboard/admin" className="text-sm text-text-secondary hover:text-text-primary">
        ← Admin dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Readiness &amp; Drills Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Quick Drill sizes, Full Mock shape, and the readiness confidence threshold — per exam. Changes apply to the
        next drill a student starts.
      </p>

      <div className="mt-6 space-y-6">
        {configs.map(({ exam, config }) => (
          <Card key={exam} title={examLabels[exam]}>
            <form action={updateExamDrillConfig} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="exam" value={exam} />
              {FIELDS.map((field) => (
                <label key={field.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-secondary">{field.label}</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      name={field.key}
                      min={1}
                      defaultValue={config[field.key]}
                      className="w-24 rounded-lg border border-border-strong bg-surface px-2 py-1 text-sm text-text-primary outline-none focus:border-brand"
                    />
                    <span className="text-xs text-text-muted">{field.suffix}</span>
                  </span>
                </label>
              ))}
              <button
                type="submit"
                className="mt-2 w-fit rounded-lg border border-border-strong px-4 py-1.5 text-sm text-text-secondary hover:border-text-muted sm:col-span-2"
              >
                Save {examLabels[exam]} settings
              </button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
