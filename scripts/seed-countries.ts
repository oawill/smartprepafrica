import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COUNTRIES = [
  { name: "Nigeria", code: "NG", currency: "NGN", currencySymbol: "₦", flag: "🇳🇬", status: "ACTIVE" as const, timezone: "Africa/Lagos" },
  { name: "Ghana", code: "GH", currency: "GHS", currencySymbol: "₵", flag: "🇬🇭", status: "DRAFT" as const, timezone: "Africa/Accra" },
  { name: "Sierra Leone", code: "SL", currency: "SLE", currencySymbol: "Le", flag: "🇸🇱", status: "DRAFT" as const, timezone: "Africa/Freetown" },
  { name: "Liberia", code: "LR", currency: "LRD", currencySymbol: "L$", flag: "🇱🇷", status: "DRAFT" as const, timezone: "Africa/Monrovia" },
  { name: "The Gambia", code: "GM", currency: "GMD", currencySymbol: "D", flag: "🇬🇲", status: "DRAFT" as const, timezone: "Africa/Banjul" },
];

const EXAM_BODIES = [
  { name: "WAEC", code: "WAEC" },
  { name: "NECO", code: "NECO" },
  { name: "JAMB", code: "JAMB" },
];

// Maps the legacy ExamType enum 1:1 onto the new Exam (product) model.
const EXAMS = [
  { name: "WASSCE", code: "WASSCE", examBodyCode: "WAEC" },
  { name: "SSCE", code: "SSCE", examBodyCode: "NECO" },
  { name: "UTME", code: "UTME", examBodyCode: "JAMB" },
  { name: "Post-UTME", code: "POST_UTME", examBodyCode: "JAMB" },
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
  const allExams = await prisma.exam.findMany();
  for (const exam of allExams) {
    await prisma.countryExam.upsert({
      where: { countryId_examId: { countryId: nigeria.id, examId: exam.id } },
      update: {},
      create: { countryId: nigeria.id, examId: exam.id, status: "ACTIVE" },
    });
  }
  console.log(`Activated ${allExams.length} exams for Nigeria.`);

  const wassce = await prisma.exam.findUniqueOrThrow({ where: { code: "WASSCE" } });
  const otherCountries = await prisma.country.findMany({ where: { code: { not: "NG" } } });
  for (const country of otherCountries) {
    await prisma.countryExam.upsert({
      where: { countryId_examId: { countryId: country.id, examId: wassce.id } },
      update: {},
      create: { countryId: country.id, examId: wassce.id, status: "DRAFT" },
    });
  }
  console.log(`Created ${otherCountries.length} draft WASSCE CountryExam rows for Ghana/Sierra Leone/Liberia/The Gambia.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
