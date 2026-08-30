import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const nigeria = await prisma.country.findUniqueOrThrow({ where: { code: "NG" } });

  const userResult = await prisma.user.updateMany({
    where: { countryId: null },
    data: { countryId: nigeria.id },
  });
  console.log(`Backfilled ${userResult.count} users to Nigeria.`);

  const schoolResult = await prisma.school.updateMany({
    where: { countryId: null },
    data: { countryId: nigeria.id },
  });
  console.log(`Backfilled ${schoolResult.count} schools to Nigeria.`);

  const partnerResult = await prisma.partner.updateMany({
    where: { countryId: null },
    data: { countryId: nigeria.id },
  });
  console.log(`Backfilled ${partnerResult.count} partners to Nigeria.`);

  // The legacy ExamType enum values don't match the new Exam.code values
  // 1:1 (WAEC -> WASSCE, NECO -> SSCE) — this table is the explicit mapping,
  // matching what seed-countries.ts creates.
  const EXAM_TYPE_TO_EXAM_CODE: Record<string, string> = {
    WAEC: "WASSCE",
    NECO: "SSCE",
    UTME: "UTME",
    POST_UTME: "POST_UTME",
  };

  const countryExams = await prisma.countryExam.findMany({
    where: { countryId: nigeria.id },
    include: { exam: true },
  });
  const countryExamIdByExamCode = new Map(countryExams.map((ce) => [ce.exam.code, ce.id]));

  let questionCount = 0;
  let passageGroupCount = 0;
  for (const [examType, examCode] of Object.entries(EXAM_TYPE_TO_EXAM_CODE)) {
    const countryExamId = countryExamIdByExamCode.get(examCode);
    if (!countryExamId) throw new Error(`No Nigeria CountryExam found for exam code ${examCode}`);

    const questionResult = await prisma.question.updateMany({
      where: { exam: examType as "WAEC" | "NECO" | "UTME" | "POST_UTME", countryExamId: null },
      data: { countryExamId },
    });
    questionCount += questionResult.count;

    const passageResult = await prisma.passageGroup.updateMany({
      where: { exam: examType as "WAEC" | "NECO" | "UTME" | "POST_UTME", countryExamId: null },
      data: { countryExamId },
    });
    passageGroupCount += passageResult.count;
  }
  console.log(`Backfilled ${questionCount} questions to their Nigeria CountryExam.`);
  console.log(`Backfilled ${passageGroupCount} passage groups to their Nigeria CountryExam.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
