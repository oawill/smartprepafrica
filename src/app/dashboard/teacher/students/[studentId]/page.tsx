import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { getStudentInsights } from "@/lib/student-insights";

const alertStyles: Record<string, string> = {
  warning: "border-amber-800 bg-amber-900/30 text-amber-300",
  info: "border-slate-700 bg-slate-800/50 text-slate-300",
  success: "border-green-800 bg-green-900/30 text-green-300",
};

export default async function TeacherStudentDetailPage({
  params,
}: PageProps<"/dashboard/teacher/students/[studentId]">) {
  const { studentId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: { classes: { select: { id: true } } },
  });
  if (!teacher) redirect("/dashboard");

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      class: { select: { id: true, name: true } },
    },
  });

  const teacherClassIds = new Set(teacher.classes.map((c) => c.id));
  if (!student || !student.classId || !teacherClassIds.has(student.classId)) {
    notFound();
  }

  const insights = await getStudentInsights(student.user.id);

  return (
    <div>
      <Link
        href={`/dashboard/teacher/classes/${student.classId}`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← {student.class?.name}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{student.user.name}</h1>
      <p className="mt-1 text-sm text-slate-400">{student.user.email}</p>

      {insights.alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {insights.alerts.map((alert, i) => (
            <p key={i} className={`rounded-lg border px-4 py-2 text-sm ${alertStyles[alert.severity]}`}>
              {alert.message}
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Avg exam score">
          <p className="text-3xl font-semibold">
            {insights.examSummary.avgScore !== null ? `${insights.examSummary.avgScore}%` : "—"}
          </p>
        </Card>
        <Card title="Exam attempts">
          <p className="text-3xl font-semibold">{insights.examSummary.totalAttempts}</p>
        </Card>
        <Card title="This week">
          <p className="text-3xl font-semibold">{insights.studyActivity.attemptsThisWeek} attempts</p>
        </Card>
        <Card title="Courses enrolled">
          <p className="text-3xl font-semibold">{insights.courseProgress.length}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Recent exam attempts">
          {insights.examSummary.recent.length === 0 ? (
            <p className="text-sm text-slate-400">No exam attempts yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {insights.examSummary.recent.map((a, i) => (
                <li key={i} className="flex justify-between text-slate-300">
                  <span>
                    {a.exam} · {a.mode.toLowerCase().replace("_", " ")}
                  </span>
                  <span className="text-slate-500">
                    {a.score !== null ? `${Math.round(a.score)}%` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Weak topics">
          {insights.weakTopics.length === 0 ? (
            <p className="text-sm text-slate-400">No weak topics identified yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {insights.weakTopics.map(({ topic, missed }) => (
                <li key={topic} className="flex justify-between text-slate-300">
                  <span>{topic}</span>
                  <span className="text-slate-500">{missed} missed</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
