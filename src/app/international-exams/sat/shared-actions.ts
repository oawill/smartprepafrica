"use server";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSatEnabled } from "@/lib/sat/config";
import { toggleFlag } from "@/lib/sat/attempt-service";

/** Flag toggling is identical across every SAT session type (skill
 * practice, diagnostic, mock exam) — one shared action rather than a
 * near-duplicate per route. */
export async function toggleSatFlag(itemId: string) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await toggleFlag(itemId, session.user.id);
}
