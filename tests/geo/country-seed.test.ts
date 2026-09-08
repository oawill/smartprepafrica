// Integration test proving Phase 1's definition of done: a second country
// (Kenya) can boot a working exam-catalog query using only seed data
// (scripts/seed-countries.ts), with zero code changes to the query paths
// that already serve Nigeria. Real queries against the local dev database,
// same convention as tests/rbac/authz-guards.test.ts. Assumes
// scripts/seed-countries.ts has already been run.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

after(async () => {
  await prisma.$disconnect();
});

describe("Kenya boots from seed data alone", () => {
  test("Kenya exists as a Country, DRAFT (not publicly visible yet)", async () => {
    const kenya = await prisma.country.findUnique({ where: { code: "KE" } });
    assert.ok(kenya, "Kenya Country row not found — run scripts/seed-countries.ts");
    assert.equal(kenya!.status, "DRAFT");
    assert.equal(kenya!.currency, "KES");
  });

  test("Kenya's KCSE exam exists under a dedicated KNEC exam body, activation-gated like every other country", async () => {
    const kenya = await prisma.country.findUniqueOrThrow({ where: { code: "KE" } });
    const countryExam = await prisma.countryExam.findFirst({
      where: { countryId: kenya.id },
      include: { exam: { include: { examBody: true } } },
    });
    assert.ok(countryExam, "no CountryExam row found for Kenya");
    assert.equal(countryExam!.exam.code, "KCSE");
    assert.equal(countryExam!.exam.examBody.code, "KNEC");
    assert.equal(countryExam!.status, "DRAFT");
  });

  test("a Kenya-scoped catalog query returns the seeded Mathematics subject and its topics", async () => {
    const kenya = await prisma.country.findUniqueOrThrow({ where: { code: "KE" } });
    const subjects = await prisma.countryExamSubject.findMany({
      where: { countryExam: { countryId: kenya.id } },
      include: { subject: { select: { name: true } }, topics: { select: { name: true }, orderBy: { order: "asc" } } },
    });

    assert.ok(subjects.length > 0, "no CountryExamSubject rows found for Kenya");
    const mathRow = subjects.find((s) => s.subject.name === "Mathematics");
    assert.ok(mathRow, "Kenya has no Mathematics CountryExamSubject row");
    assert.ok(mathRow!.topics.length >= 2, "expected at least 2 seeded ExamTopic rows under Kenya/KCSE/Mathematics");
  });

  test("Kenya does NOT get WASSCE, and Nigeria does NOT get KCSE — no cross-country contamination", async () => {
    const [kenya, nigeria] = await Promise.all([
      prisma.country.findUniqueOrThrow({ where: { code: "KE" } }),
      prisma.country.findUniqueOrThrow({ where: { code: "NG" } }),
    ]);
    const [kenyaExams, nigeriaExams] = await Promise.all([
      prisma.countryExam.findMany({ where: { countryId: kenya.id }, include: { exam: true } }),
      prisma.countryExam.findMany({ where: { countryId: nigeria.id }, include: { exam: true } }),
    ]);
    assert.ok(!kenyaExams.some((ce) => ce.exam.code === "WASSCE"), "Kenya incorrectly has a WASSCE CountryExam row");
    assert.ok(!nigeriaExams.some((ce) => ce.exam.code === "KCSE"), "Nigeria incorrectly has a KCSE CountryExam row");
  });

  test("Nigeria's existing WASSCE/SSCE/UTME/POST_UTME activation is unaffected by Kenya's addition", async () => {
    const nigeria = await prisma.country.findUniqueOrThrow({ where: { code: "NG" } });
    const nigeriaExams = await prisma.countryExam.findMany({
      where: { countryId: nigeria.id },
      include: { exam: true },
    });
    const activeCodes = nigeriaExams.filter((ce) => ce.status === "ACTIVE").map((ce) => ce.exam.code).sort();
    assert.deepEqual(activeCodes, ["POST_UTME", "SSCE", "UTME", "WASSCE"]);
  });
});
