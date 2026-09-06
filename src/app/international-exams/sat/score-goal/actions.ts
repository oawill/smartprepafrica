"use server";

import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isSatEnabled } from "@/lib/sat/config";
import { saveScoreGoal } from "@/lib/sat/score-goal-service";

export async function saveSatScoreGoal(formData: FormData) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const targetScore = Number(formData.get("targetScore"));
  const testDateRaw = formData.get("testDate");
  const testDate = typeof testDateRaw === "string" && testDateRaw ? new Date(testDateRaw) : null;

  await saveScoreGoal(session.user.id, targetScore, testDate);
  revalidatePath("/international-exams/sat/score-goal");
  revalidatePath("/international-exams/sat/dashboard");
}
