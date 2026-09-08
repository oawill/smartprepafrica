import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COUNTRIES = [
  { name: "Nigeria", code: "NG", currency: "NGN", currencySymbol: "₦", flag: "🇳🇬", status: "ACTIVE" as const, timezone: "Africa/Lagos" },
  { name: "Ghana", code: "GH", currency: "GHS", currencySymbol: "₵", flag: "🇬🇭", status: "DRAFT" as const, timezone: "Africa/Accra" },
  { name: "Sierra Leone", code: "SL", currency: "SLE", currencySymbol: "Le", flag: "🇸🇱", status: "DRAFT" as const, timezone: "Africa/Freetown" },
  { name: "Liberia", code: "LR", currency: "LRD", currencySymbol: "L$", flag: "🇱🇷", status: "DRAFT" as const, timezone: "Africa/Monrovia" },
  { name: "The Gambia", code: "GM", currency: "GMD", currencySymbol: "D", flag: "🇬🇲", status: "DRAFT" as const, timezone: "Africa/Banjul" },
  { name: "Kenya", code: "KE", currency: "KES", currencySymbol: "KSh", flag: "🇰🇪", status: "DRAFT" as const, timezone: "Africa/Nairobi" },
];

const EXAM_BODIES = [
  { name: "WAEC", code: "WAEC" },
  { name: "NECO", code: "NECO" },
  { name: "JAMB", code: "JAMB" },
  { name: "KNEC", code: "KNEC" },
];

// Maps the legacy ExamType enum 1:1 onto the new Exam (product) model.
// KCSE has no ExamType equivalent — it's the first Exam not bridged from
// the legacy enum, proving the model doesn't require one.
const EXAMS = [
  { name: "WASSCE", code: "WASSCE", examBodyCode: "WAEC" },
  { name: "SSCE", code: "SSCE", examBodyCode: "NECO" },
  { name: "UTME", code: "UTME", examBodyCode: "JAMB" },
  { name: "Post-UTME", code: "POST_UTME", examBodyCode: "JAMB" },
  { name: "KCSE", code: "KCSE", examBodyCode: "KNEC" },
];

async function main() {
  for (const c of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log(`Upserted ${COUNTRIES.length} countries.`);

  for (const eb of EXAM_BODIES) {
    await prisma.examBody.upsert({
      where: { code: eb.code },
      update: {},
      create: eb,
    });
  }
  console.log(`Upserted ${EXAM_BODIES.length} exam bodies.`);

  for (const e of EXAMS) {
    const examBody = await prisma.examBody.findUniqueOrThrow({ where: { code: e.examBodyCode } });
    await prisma.exam.upsert({
      where: { code: e.code },
      update: {},
      create: { name: e.name, code: e.code, examBodyId: examBody.id },
    });
  }
  console.log(`Upserted ${EXAMS.length} exams.`);

  const nigeria = await prisma.country.findUniqueOrThrow({ where: { code: "NG" } });
  // Explicitly Nigeria's own exams only — NOT prisma.exam.findMany() (all
  // exams globally), which would wrongly activate e.g. Kenya's KCSE for
  // Nigeria too now that more than one country's exams exist in this table.
  const nigeriaExamCodes = ["WASSCE", "SSCE", "UTME", "POST_UTME"];
  const nigeriaExams = await prisma.exam.findMany({ where: { code: { in: nigeriaExamCodes } } });
  for (const exam of nigeriaExams) {
    await prisma.countryExam.upsert({
      where: { countryId_examId: { countryId: nigeria.id, examId: exam.id } },
      update: {},
      create: { countryId: nigeria.id, examId: exam.id, status: "ACTIVE" },
    });
  }
  console.log(`Activated ${nigeriaExams.length} exams for Nigeria.`);

  const wassce = await prisma.exam.findUniqueOrThrow({ where: { code: "WASSCE" } });
  const wassceCountries = await prisma.country.findMany({
    where: { code: { in: ["GH", "SL", "LR", "GM"] } },
  });
  for (const country of wassceCountries) {
    await prisma.countryExam.upsert({
      where: { countryId_examId: { countryId: country.id, examId: wassce.id } },
      update: {},
      create: { countryId: country.id, examId: wassce.id, status: "DRAFT" },
    });
  }
  console.log(`Created ${wassceCountries.length} draft WASSCE CountryExam rows for Ghana/Sierra Leone/Liberia/The Gambia.`);

  const kenya = await prisma.country.findUniqueOrThrow({ where: { code: "KE" } });
  const kcse = await prisma.exam.findUniqueOrThrow({ where: { code: "KCSE" } });
  const kenyaCountryExam = await prisma.countryExam.upsert({
    where: { countryId_examId: { countryId: kenya.id, examId: kcse.id } },
    update: {},
    create: { countryId: kenya.id, examId: kcse.id, status: "DRAFT" },
  });
  console.log("Created draft KCSE CountryExam row for Kenya.");

  // Smoke-test fixture data proving a country can boot from seed data alone
  // (see docs/migration-plan.md Phase 1) — not a real syllabus. Reuses the
  // existing shared Mathematics Subject row rather than creating a
  // Kenya-specific one, per the Subject model's intentional design.
  const mathematics = await prisma.subject.findUnique({ where: { name: "Mathematics" } });
  if (mathematics) {
    const kenyaMath = await prisma.countryExamSubject.upsert({
      where: { countryExamId_subjectId: { countryExamId: kenyaCountryExam.id, subjectId: mathematics.id } },
      update: {},
      create: { countryExamId: kenyaCountryExam.id, subjectId: mathematics.id },
    });
    const kenyaTopics = ["Algebra (KCSE smoke-test fixture)", "Geometry (KCSE smoke-test fixture)"];
    for (const [order, name] of kenyaTopics.entries()) {
      await prisma.examTopic.upsert({
        where: { id: `kenya-kcse-math-fixture-${order}` },
        update: { name, order },
        create: { id: `kenya-kcse-math-fixture-${order}`, countryExamSubjectId: kenyaMath.id, name, order },
      });
    }
    console.log(`Created ${kenyaTopics.length} smoke-test ExamTopic rows for Kenya/KCSE/Mathematics.`);
  } else {
    console.log("Skipped Kenya/KCSE/Mathematics fixture — no global Mathematics Subject found.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
