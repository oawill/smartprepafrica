import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type EducationAccessImpact = {
  studentsSponsored: number;
  schoolsReached: number;
  statesReached: number;
  lessonsCompleted: number;
  examAttempts: number;
  certificates: number;
};

// Platform-wide, real numbers only — no fabrication, no placeholders once
// live. Scoped to students who redeemed a sponsor-issued voucher (the
// pre-existing SponsorProfile -> SponsorshipProgram -> Voucher ->
// VoucherRedemption system), not the Education Access inquiry pipeline
// itself (inquiries aren't fulfilled sponsorships yet).
async function computeEducationAccessImpact(): Promise<EducationAccessImpact> {
  const redemptions = await prisma.voucherRedemption.findMany({
    where: { voucher: { sponsorId: { not: null } } },
    select: { userId: true },
  });
  const sponsoredUserIds = redemptions.map((r) => r.userId);

  const [schoolRows, stateRows, lessonsCompleted, examAttempts, certificates] = await Promise.all([
    prisma.sponsorshipProgram.findMany({
      where: { schoolId: { not: null } },
      select: { schoolId: true },
      distinct: ["schoolId"],
    }),
    prisma.school.findMany({
      where: { sponsorshipPrograms: { some: {} } },
      select: { state: true },
      distinct: ["state"],
    }),
    prisma.lessonProgress.count({
      where: { enrollment: { userId: { in: sponsoredUserIds } }, completedAt: { not: null } },
    }),
    prisma.examAttempt.count({
      where: { userId: { in: sponsoredUserIds }, submittedAt: { not: null } },
    }),
    prisma.certificate.count({ where: { userId: { in: sponsoredUserIds } } }),
  ]);

  return {
    studentsSponsored: sponsoredUserIds.length,
    schoolsReached: schoolRows.length,
    statesReached: stateRows.filter((s) => s.state).length,
    lessonsCompleted,
    examAttempts,
    certificates,
  };
}

export const getEducationAccessImpact = unstable_cache(computeEducationAccessImpact, ["education-access-impact"], {
  revalidate: 3600,
  tags: ["education-access-impact"],
});
