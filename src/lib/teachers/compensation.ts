import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { generateTeacherCommissionNumber } from "@/lib/teachers/ids";
import { formatMoney } from "@/lib/plans";

// TeacherPayoutSettings is a single global config row, not country-scoped,
// so this stays NGN-hardcoded — there's no per-country amount to plumb
// through yet.
export function formatNaira(amountKobo: number): string {
  return formatMoney(amountKobo, "NGN");
}

/** Singleton config row, created with defaults on first read — same
 * upsert-on-read pattern as src/lib/partners/settings.ts's
 * getPartnerSettings. Admins edit it in place from the teacher-payouts
 * admin page. */
export async function getTeacherPayoutSettings() {
  return prisma.teacherPayoutSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

/** Awards a flat, one-time commission when a paying-plan student enrolls
 * in a real teacher's subscription-gated course — the one discrete,
 * attributable event this platform's payment model actually supports
 * (see the plan's Context: there is no per-course payment to split).
 * No-ops silently (not an error) when the course has no teacher or
 * doesn't require a subscription — a Skills-category or centrally-seeded
 * course simply never generates a commission. Idempotent per
 * (teacher, course, student) via the schema's @@unique constraint. */
export async function awardEnrollmentCommission(courseId: string, studentUserId: string): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true, requiresSubscription: true, teacher: { select: { userId: true } } },
  });
  if (!course?.teacherId || !course.requiresSubscription || !course.teacher) return;

  const settings = await getTeacherPayoutSettings();
  const commissionNumber = await generateTeacherCommissionNumber();

  try {
    await prisma.teacherCommission.create({
      data: {
        commissionNumber,
        teacherId: course.teacherId,
        courseId,
        studentUserId,
        amountKobo: settings.commissionPerEnrollmentKobo,
        status: "AVAILABLE",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return; // Already awarded for this teacher+course+student — no-op.
    }
    throw error;
  }

  await notifyUser(
    course.teacher.userId,
    "TEACHER_COMMISSION_EARNED",
    `You earned ${formatNaira(settings.commissionPerEnrollmentKobo)} for a new enrollment.`,
    "/dashboard/teacher/payouts"
  );
}
