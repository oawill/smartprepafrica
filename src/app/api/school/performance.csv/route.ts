import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { averageScore } from "@/lib/school-performance";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await prisma.school.findFirst({
    where: { admins: { some: { id: session.user.id } } },
  });
  if (!school) {
    return NextResponse.json({ error: "Not a school administrator" }, { status: 403 });
  }

  const students = await prisma.studentProfile.findMany({
    where: { schoolId: school.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      class: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
  const studentUserIds = students.map((s) => s.user.id);

  const [attempts, enrollments] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { userId: { in: studentUserIds }, submittedAt: { not: null } },
      select: { userId: true, score: true },
    }),
    prisma.courseEnrollment.findMany({
      where: { userId: { in: studentUserIds } },
      select: {
        userId: true,
        course: { select: { modules: { select: { lessons: { select: { id: true } } } } } },
        lessonProgress: { where: { completedAt: { not: null } }, select: { lessonId: true } },
      },
    }),
  ]);

  const attemptsByUser = new Map<string, { score: number | null }[]>();
  for (const a of attempts) {
    const list = attemptsByUser.get(a.userId) ?? [];
    list.push({ score: a.score });
    attemptsByUser.set(a.userId, list);
  }

  const completionByUser = new Map<string, number[]>();
  for (const e of enrollments) {
    const total = e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const rate = total > 0 ? e.lessonProgress.length / total : 0;
    const list = completionByUser.get(e.userId) ?? [];
    list.push(rate);
    completionByUser.set(e.userId, list);
  }

  const rows: (string | number)[][] = [
    ["Name", "Email", "Class", "Grade level", "Avg CBT score", "Course completion %"],
    ...students.map((s) => {
      const avgScore = averageScore(attemptsByUser.get(s.user.id) ?? []);
      const rates = completionByUser.get(s.user.id) ?? [];
      const avgCompletion =
        rates.length > 0 ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : null;
      return [
        s.user.name,
        s.user.email,
        s.class?.name ?? "",
        s.gradeLevel ?? "",
        avgScore ?? "",
        avgCompletion ?? "",
      ];
    }),
  ];

  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${school.name.replace(/[^a-z0-9]+/gi, "-")}-performance.csv"`,
    },
  });
}
