import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";

export default async function TeacherClassPage({
  params,
}: PageProps<"/dashboard/teacher/classes/[classId]">) {
  const { classId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!teacher) redirect("/dashboard");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      teachers: { select: { id: true } },
      students: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!cls || !cls.teachers.some((t) => t.id === teacher.id)) notFound();

  const studentUserIds = cls.students.map((s) => s.user.id);
  const attempts = studentUserIds.length
    ? await prisma.examAttempt.findMany({
        where: { userId: { in: studentUserIds }, submittedAt: { not: null } },
        select: { userId: true, score: true },
      })
    : [];

  const avgByUser = new Map<string, number>();
  for (const userId of studentUserIds) {
    const scores = attempts.filter((a) => a.userId === userId && a.score !== null).map((a) => a.score!);
    if (scores.length > 0) {
      avgByUser.set(userId, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
    }
  }

  return (
    <div>
      <Link href="/dashboard/teacher" className="text-sm text-slate-400 hover:text-white">
        ← Teacher dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{cls.name}</h1>
      <p className="mt-1 text-sm text-slate-400">{cls.students.length} students</p>

      <div className="mt-6">
        <Card title="Roster">
          {cls.students.length === 0 ? (
            <p className="text-sm text-slate-400">No students in this class yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Avg CBT score</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {cls.students.map((s) => (
                  <tr key={s.id} className="border-t border-slate-800">
                    <td className="py-2">{s.user.name}</td>
                    <td className="py-2 text-slate-400">
                      {avgByUser.has(s.user.id) ? `${avgByUser.get(s.user.id)}%` : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/dashboard/teacher/students/${s.id}`}
                        className="text-orange-400 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
