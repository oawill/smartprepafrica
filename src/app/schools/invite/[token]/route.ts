import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public entry point a partner shares with a school contact:
// educom.ng/schools/invite/<token> — resolves the lead and hands off to
// registration with the school name prefilled and the invite token carried
// forward so the originating partner stays attached once the school signs up.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const baseUrl = request.nextUrl.origin;

  const lead = await prisma.partnerSchoolLead.findUnique({ where: { invitationToken: token } });

  if (!lead || (lead.invitationExpiresAt && lead.invitationExpiresAt < new Date())) {
    return NextResponse.redirect(`${baseUrl}/register?schoolInvite=invalid`);
  }

  const destination = new URL("/register", baseUrl);
  destination.searchParams.set("schoolInvite", token);
  destination.searchParams.set("schoolName", lead.schoolName);

  return NextResponse.redirect(destination);
}
