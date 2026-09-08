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

  // English Language is the one real, well-known compulsory UTME/JAMB
  // subject — see getCompulsorySubjectNames() in
  // src/lib/practice/exam-profile-service.ts, which reads this flag
  // instead of a hardcoded string check.
  const utmeExam = await prisma.exam.findUniqueOrThrow({ where: { code: "UTME" } });
  const utmeCountryExamId = countryExamIdByExamCode.get(utmeExam.code);
  const englishSubject = await prisma.subject.findUnique({ where: { name: "English Language" } });
  if (utmeCountryExamId && englishSubject) {
    await prisma.countryExamSubject.upsert({
      where: { countryExamId_subjectId: { countryExamId: utmeCountryExamId, subjectId: englishSubject.id } },
      update: { isCompulsory: true },
      create: { countryExamId: utmeCountryExamId, subjectId: englishSubject.id, isCompulsory: true },
    });
    console.log("Marked English Language compulsory for Nigeria/UTME.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
