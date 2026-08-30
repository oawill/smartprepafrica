import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const nigeria = await prisma.country.findUniqueOrThrow({ where: { code: "NG" } });
  const countryExams = await prisma.countryExam.findMany({
    where: { countryId: nigeria.id },
    include: { exam: true },
  });

  // Same "which subjects actually have questions for this exam" pattern
  // already used in src/app/dashboard/admin/subjects/page.tsx, so the
  // seeded links reflect real content rather than a guessed list.
  const examTypeRows = await prisma.question.groupBy({
    by: ["subjectId", "exam"],
    _count: { _all: true },
  });

  const EXAM_TYPE_TO_EXAM_CODE: Record<string, string> = {
    WAEC: "WASSCE",
    NECO: "SSCE",
    UTME: "UTME",
    POST_UTME: "POST_UTME",
  };
  const countryExamIdByExamCode = new Map(countryExams.map((ce) => [ce.exam.code, ce.id]));

  let linkCount = 0;
  for (const row of examTypeRows) {
    const examCode = EXAM_TYPE_TO_EXAM_CODE[row.exam];
    const countryExamId = countryExamIdByExamCode.get(examCode);
    if (!countryExamId) continue;

    await prisma.countryExamSubject.upsert({
      where: { countryExamId_subjectId: { countryExamId, subjectId: row.subjectId } },
      update: {},
      create: { countryExamId, subjectId: row.subjectId },
    });
    linkCount += 1;
  }
  console.log(`Upserted ${linkCount} CountryExamSubject links for Nigeria.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
