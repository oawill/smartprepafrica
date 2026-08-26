import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// A school admin shares this link with a teacher/student who doesn't have a
// SmartPrepAfrica account yet — resolves the invitation and hands off to
// registration with the role and school prefilled. Unrelated to
// /schools/invite/[token] (a partner recruiting a brand-new school).
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const baseUrl = request.nextUrl.origin;

  const invite = await prisma.schoolInvitation.findUnique({
    where: { invitationToken: token },
    include: { school: { select: { name: true } } },
  });

  if (!invite || invite.status !== "PENDING" || invite.invitationExpiresAt < new Date()) {
    return NextResponse.redirect(`${baseUrl}/register?staffInvite=invalid`);
  }

  // Re-check account existence at click time, not just at invite-generation
  // time — the admin's UI guess could be stale by the time the link is
  // actually followed.
  const existingUser = await prisma.user.findUnique({ where: { email: invite.inviteeEmail } });
  if (existingUser) {
    return NextResponse.redirect(`${baseUrl}/login?callbackUrl=/dashboard/${invite.role.toLowerCase()}`);
  }

  const destination = new URL("/register", baseUrl);
  destination.searchParams.set("staffInvite", token);
  destination.searchParams.set("staffRole", invite.role);
  destination.searchParams.set("schoolName", invite.school.name);

  return NextResponse.redirect(destination);
}
