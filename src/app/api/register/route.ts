import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { captureAttributionAtRegistration, hashIp } from "@/lib/partners/attribution";
import { registerSchoolFromInvitation } from "@/lib/partners/school-leads";
import { registerStaffFromInvitation } from "@/lib/school-invitations";
import { recordAcceptance } from "@/lib/legal/documents";
import { logAudit } from "@/lib/admin/audit";
import { createStudentAccount } from "@/lib/registration/create-student-account";
import { resolveRegistrationCountry } from "@/lib/registration/resolve-country";
import { resolveSchoolByJoinCode } from "@/lib/registration/school-join-code";

const baseFields = {
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  ref: z.string().optional(),
  campaign: z.string().optional(),
  clickToken: z.string().optional(),
  countryCode: z.string().optional(),
  agreeToTerms: z.literal(true, {
    message: "You must agree to the Terms & Conditions and Privacy Policy.",
  }),
};

const registerSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("STUDENT"),
    ...baseFields,
    staffInviteToken: z.string().optional(),
    schoolJoinCode: z.string().optional(),
    schoolJoinPin: z.string().optional(),
    examCodes: z.array(z.string()).optional(),
    subjectIds: z.array(z.string()).optional(),
  }),
  z.object({ role: z.literal("PARENT"), ...baseFields }),
  z.object({
    role: z.literal("TEACHER"),
    ...baseFields,
    staffInviteToken: z.string().optional(),
    schoolJoinCode: z.string().optional(),
    schoolJoinPin: z.string().optional(),
  }),
  z.object({ role: z.literal("SPONSOR"), ...baseFields }),
  z.object({
    role: z.literal("SCHOOL_ADMIN"),
    ...baseFields,
    schoolName: z.string().min(2).optional(),
    inviteToken: z.string().optional(),
  }),
]);

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.role === "SCHOOL_ADMIN" && !data.schoolName && !data.inviteToken) {
    return NextResponse.json(
      { error: { fieldErrors: { schoolName: ["School name is required."] } } },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const country = await resolveRegistrationCountry(data.countryCode);

  const cookieStore = await cookies();
  const refCode = data.ref || cookieStore.get("edp_ref")?.value || null;
  const campaignSlug = data.campaign || cookieStore.get("edp_campaign")?.value || null;
  const clickToken = data.clickToken || cookieStore.get("edp_click")?.value || null;
  const ipHash = hashIp(request.headers.get("x-forwarded-for"));
  const userAgent = request.headers.get("user-agent");

  const user = await prisma.$transaction(async (tx) => {
    if (data.role === "STUDENT") {
      return createStudentAccount(tx, {
        name: data.name,
        email: data.email,
        passwordHash,
        countryId: country?.id,
        staffInviteToken: data.staffInviteToken,
        schoolJoinCode: data.schoolJoinCode,
        schoolJoinPin: data.schoolJoinPin,
        examCodes: data.examCodes,
        subjectIds: data.subjectIds,
        refCode,
        campaignSlug,
        clickToken,
        ipHash,
        userAgent,
      });
    }

    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        countryId: country?.id,
      },
    });
    await tx.userRole.create({ data: { userId: user.id, role: data.role } });

    switch (data.role) {
      case "TEACHER":
        if (data.staffInviteToken) {
          await registerStaffFromInvitation(tx, data.staffInviteToken, "TEACHER", user.id);
        } else {
          // Door 2 — self-registered via school join-code stays PENDING
          // (schema comment on TeacherProfile.applicationStatus): the
          // code proves school affiliation, not per-person vetting, so
          // this is not the same as an admin-approved invite link.
          const school =
            data.schoolJoinCode && data.schoolJoinPin
              ? await resolveSchoolByJoinCode(tx, data.schoolJoinCode, data.schoolJoinPin)
              : null;
          await tx.teacherProfile.create({ data: { userId: user.id, schoolId: school?.id } });
        }
        break;
      case "SPONSOR":
        await tx.sponsorProfile.create({ data: { userId: user.id } });
        break;
      case "SCHOOL_ADMIN":
        if (data.inviteToken) {
          await registerSchoolFromInvitation(tx, data.inviteToken, user.id);
        } else {
          await tx.school.create({
            data: {
              name: data.schoolName!,
              admins: { connect: { id: user.id } },
            },
          });
        }
        break;
      case "PARENT":
        // No extra profile yet — parents link to children after signup.
        break;
    }

    // A school-invitation registration already gets its partner attribution
    // via registerSchoolFromInvitation above — applying the general ref-code
    // path on top (e.g. from a stale edp_ref cookie left by an earlier,
    // unrelated click) would double-attribute this one registration to two
    // different referral mechanisms.
    const isSchoolInvitation = data.role === "SCHOOL_ADMIN" && !!data.inviteToken;
    if (refCode && !isSchoolInvitation) {
      await captureAttributionAtRegistration(tx, user.id, {
        code: refCode,
        campaignSlug,
        clickToken,
        landingPage: "/register",
        ipHash,
        userAgent,
      });
    }

    await recordAcceptance(tx, { type: "TERMS", userId: user.id, context: "REGISTRATION", ipHash });
    await recordAcceptance(tx, { type: "PRIVACY", userId: user.id, context: "REGISTRATION", ipHash });

    return user;
  });

  if ((data.role === "STUDENT" || data.role === "TEACHER") && data.staffInviteToken) {
    await logAudit({
      actorUserId: user.id,
      actorRole: data.role,
      action: "SCHOOL_INVITE_ACCEPTED",
      resourceType: "SchoolInvitation",
      result: "SUCCESS",
    });
  }

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
