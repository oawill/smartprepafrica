"use server";

import { notFound } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { isSatEnabled } from "@/lib/sat/config";
import { toggleFlag } from "@/lib/sat/attempt-service";

/** Flag toggling is identical across every SAT session type (skill
 * practice, diagnostic, mock exam) — one shared action rather than a
 * near-duplicate per route. */
export async function toggleSatFlag(itemId: string) {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "SAT");

  await toggleFlag(itemId, session.user.id);
}
