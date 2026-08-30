import { prisma } from "@/lib/prisma";
import RegisterForm, { type ExamsByCountry } from "@/app/(auth)/register/register-form";

export default async function RegisterPage() {
  const [countries, countryExams] = await Promise.all([
    prisma.country.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { code: true, name: true, flag: true },
    }),
    prisma.countryExam.findMany({
      where: { status: "ACTIVE" },
      include: {
        country: { select: { code: true } },
        exam: { select: { code: true, name: true } },
        subjects: { include: { subject: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const examsByCountry: ExamsByCountry = {};
  for (const ce of countryExams) {
    const list = (examsByCountry[ce.country.code] ??= []);
    list.push({
      code: ce.exam.code,
      name: ce.exam.name,
      subjects: ce.subjects.map((s) => ({ id: s.subject.id, name: s.subject.name })),
    });
  }

  return <RegisterForm countries={countries} examsByCountry={examsByCountry} />;
}
