import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import {
  generateCertificateVerificationCode,
  ensureCertificateVerificationCode,
} from "../../src/lib/certificates/verification-code";
import { prisma, uniqueSuffix, createUser, deleteUsers } from "../helpers/fixtures";

describe("generateCertificateVerificationCode", () => {
  test("always has the CERT- prefix and 8 uppercase hex characters", () => {
    for (let i = 0; i < 50; i++) {
      assert.match(generateCertificateVerificationCode(), /^CERT-[0-9A-F]{8}$/);
    }
  });

  test("is not deterministic", () => {
    const samples = new Set(Array.from({ length: 20 }, () => generateCertificateVerificationCode()));
    assert.ok(samples.size > 1);
  });
});

describe("ensureCertificateVerificationCode (DB-backed)", () => {
  const userIds: string[] = [];
  const courseIds: string[] = [];
  const certificateIds: string[] = [];

  after(async () => {
    await prisma.certificate.deleteMany({ where: { id: { in: certificateIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await deleteUsers(userIds);
  });

  async function makeCertificate(verificationCode: string | null) {
    const student = await createUser("STUDENT", "cert-verification-code");
    userIds.push(student.id);
    const course = await prisma.course.create({
      data: {
        title: `Verification Code Test Course ${uniqueSuffix()}`,
        description: "test",
        category: "ACADEMIC",
        requiresSubscription: false,
      },
    });
    courseIds.push(course.id);
    const certificate = await prisma.certificate.create({
      data: { userId: student.id, courseId: course.id, verificationCode },
    });
    certificateIds.push(certificate.id);
    return certificate;
  }

  test("generates and persists a code when the certificate has none", async () => {
    const certificate = await makeCertificate(null);

    const code = await ensureCertificateVerificationCode(certificate.id, certificate.verificationCode);

    assert.match(code, /^CERT-[0-9A-F]{8}$/);
    const refetched = await prisma.certificate.findUniqueOrThrow({ where: { id: certificate.id } });
    assert.equal(refetched.verificationCode, code);
  });

  test("returns the existing code unchanged, with no extra write", async () => {
    const existingCode = generateCertificateVerificationCode();
    const certificate = await makeCertificate(existingCode);

    const code = await ensureCertificateVerificationCode(certificate.id, certificate.verificationCode);

    assert.equal(code, existingCode);
  });

  test("a freshly-created certificate via the upsert shape from learn/actions.ts ends up with a valid code", async () => {
    const student = await createUser("STUDENT", "cert-verification-upsert");
    userIds.push(student.id);
    const course = await prisma.course.create({
      data: {
        title: `Verification Code Upsert Course ${uniqueSuffix()}`,
        description: "test",
        category: "ACADEMIC",
        requiresSubscription: false,
      },
    });
    courseIds.push(course.id);

    const certificate = await prisma.certificate.upsert({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
      update: {},
      create: {
        userId: student.id,
        courseId: course.id,
        verificationCode: generateCertificateVerificationCode(),
      },
    });
    certificateIds.push(certificate.id);

    assert.match(certificate.verificationCode ?? "", /^CERT-[0-9A-F]{8}$/);
  });
});
