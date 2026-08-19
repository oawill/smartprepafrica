import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

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
      user: { select: { name: true, email: true } },
      class: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const rows: (string | number)[][] = [
    ["Name", "Email", "Class", "Grade level"],
    ...students.map((s) => [
      s.user.name,
      s.user.email,
      s.class?.name ?? "",
      s.gradeLevel ?? "",
    ]),
  ];

  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${school.name.replace(/[^a-z0-9]+/gi, "-")}-roster.csv"`,
    },
  });
}
