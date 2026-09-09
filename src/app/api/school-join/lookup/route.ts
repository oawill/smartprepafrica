import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveSchoolByJoinCode } from "@/lib/registration/school-join-code";

const schema = z.object({ joinCode: z.string().trim().min(1), joinPin: z.string().trim().min(1) });

/** Read-only preflight for the register form's "Have a school join
 * code?" step — shows the school's name before the rest of the form
 * commits to it. Registration itself re-validates the pair independently
 * (see school-join-code.ts's callers), so this endpoint has no
 * side effects and needs no rate limiting: a wrong PIN just fails to
 * resolve a name, nothing is sent or consumed. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a school code and PIN." }, { status: 400 });
  }

  try {
    const school = await resolveSchoolByJoinCode(prisma, parsed.data.joinCode, parsed.data.joinPin);
    return NextResponse.json({ schoolName: school.name }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid school code or PIN." }, { status: 400 });
  }
}
