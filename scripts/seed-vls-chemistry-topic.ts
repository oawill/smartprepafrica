import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ExamTopic has zero seeded rows anywhere in the app today — this creates
// the one real topic the Video Learning Studio pilot needs
// (Nigeria/WAEC/Chemistry: "Acids, Bases and Salts") through the same
// relational chain every other exam-content model uses, not a special case.
async function main() {
  const nigeria = await prisma.country.findUniqueOrThrow({ where: { code: "NG" } });
  const waec = await prisma.exam.findUniqueOrThrow({ where: { code: "WASSCE" } });
  const countryExam = await prisma.countryExam.findUniqueOrThrow({
    where: { countryId_examId: { countryId: nigeria.id, examId: waec.id } },
  });
  const chemistry = await prisma.subject.findUniqueOrThrow({ where: { name: "Chemistry" } });

  const countryExamSubject = await prisma.countryExamSubject.upsert({
    where: { countryExamId_subjectId: { countryExamId: countryExam.id, subjectId: chemistry.id } },
    update: {},
    create: { countryExamId: countryExam.id, subjectId: chemistry.id },
  });

  const existing = await prisma.examTopic.findFirst({
    where: { countryExamSubjectId: countryExamSubject.id, name: "Acids, Bases and Salts" },
  });
  if (existing) {
    console.log("Topic already exists.");
    return;
  }

  await prisma.examTopic.create({
    data: { countryExamSubjectId: countryExamSubject.id, name: "Acids, Bases and Salts", order: 1 },
  });
  console.log("Created ExamTopic: Acids, Bases and Salts (Nigeria / WASSCE / Chemistry).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
