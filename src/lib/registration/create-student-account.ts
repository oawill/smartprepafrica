import type { Prisma, User } from "@prisma/client";
import { captureAttributionAtRegistration } from "@/lib/partners/attribution";
import { registerStaffFromInvitation } from "@/lib/school-invitations";
import { resolveSchoolByJoinCode } from "@/lib/registration/school-join-code";
import { recordAcceptance } from "@/lib/legal/documents";
import { EXAM_CODE_TO_EXAM_TYPE } from "@/lib/exam-type-mapping";

export type CreateStudentAccountInput = {
  name: string;
  email: string;
  /** Set only by the phone+OTP signup path (src/lib/auth.ts's
   * "phone-otp" provider) — omitted for the email+password path, which
   * always sets passwordHash instead. */
  phone?: string;
  passwordHash?: string;
  countryId?: string;
  staffInviteToken?: string;
  /** Door 2 — school join-code self-registration (see
   * src/lib/registration/school-join-code.ts). Ignored when
   * staffInviteToken is also set — an invite link always wins. */
  schoolJoinCode?: string;
  schoolJoinPin?: string;
  examCodes?: string[];
  subjectIds?: string[];
  refCode?: string | null;
  campaignSlug?: string | null;
  clickToken?: string | null;
  ipHash: string | null;
  userAgent: string | null;
};

/** The STUDENT-role account-creation transaction, shared by
 * /api/register's email+password path and the "phone-otp" NextAuth
 * provider's registration path — extracted so both stay byte-identical
 * rather than drifting. Creates the User, UserRole, StudentProfile (or
 * accepts a school staff invite), captures partner attribution, and
 * records ToS/Privacy acceptance, all in the caller's transaction. */
export async function createStudentAccount(
  tx: Prisma.TransactionClient,
  data: CreateStudentAccountInput
): Promise<User> {
  const user = await tx.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: data.passwordHash,
      role: "STUDENT",
      countryId: data.countryId,
    },
  });
  await tx.userRole.create({ data: { userId: user.id, role: "STUDENT" } });

  if (data.staffInviteToken) {
    await registerStaffFromInvitation(tx, data.staffInviteToken, "STUDENT", user.id);
  } else {
    const targetExams = (data.examCodes ?? [])
      .map((code) => EXAM_CODE_TO_EXAM_TYPE[code])
      .filter((examType): examType is NonNullable<typeof examType> => !!examType);
    // Door 2 — no classId: cohort assignment stays admin-driven
    // afterward, same as a bulk-uploaded or invite-linked student.
    const school =
      data.schoolJoinCode && data.schoolJoinPin
        ? await resolveSchoolByJoinCode(tx, data.schoolJoinCode, data.schoolJoinPin)
        : null;
    await tx.studentProfile.create({
      data: {
        userId: user.id,
        schoolId: school?.id,
        targetExams,
        targetSubjects: data.subjectIds?.length
          ? { connect: data.subjectIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  if (data.refCode) {
    await captureAttributionAtRegistration(tx, user.id, {
      code: data.refCode,
      campaignSlug: data.campaignSlug,
      clickToken: data.clickToken,
      landingPage: "/register",
      ipHash: data.ipHash,
      userAgent: data.userAgent,
    });
  }

  await recordAcceptance(tx, { type: "TERMS", userId: user.id, context: "REGISTRATION", ipHash: data.ipHash });
  await recordAcceptance(tx, { type: "PRIVACY", userId: user.id, context: "REGISTRATION", ipHash: data.ipHash });

  return user;
}
