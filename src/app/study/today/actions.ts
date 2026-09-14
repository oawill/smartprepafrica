"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStudentSession } from "@/lib/exam-access";
import { examSlugs } from "@/lib/exam-slugs";
import { startTopicDrill, startQuickDrill } from "@/app/practice/drills/actions";

/** The one genuinely new action this phase needs — everything else
 * (mark complete, skip, reschedule, regenerate) is reused directly from
 * src/app/study-plan/actions.ts. Marks the item in-progress, then hands
 * off to the EXISTING drill/mock attempt-creation actions (which already
 * redirect straight into /practice/session/[attemptId] with no picker
 * screen) or a plain redirect for a lesson — so "Start Activity" is a
 * true one-tap start into real content, never a new content system. */
export async function startTodayActivity(formData: FormData) {
  const session = await requireStudentSession("/study/today");
  const itemId = formData.get("itemId") as string;

  const item = await prisma.studyPlanItem.findUnique({
    where: { id: itemId },
    include: { studyPlan: { select: { userId: true } } },
  });
  if (!item || item.studyPlan.userId !== session.user.id) {
    throw new Error("Study plan item not found.");
  }

  await prisma.studyPlanItem.update({
    where: { id: itemId },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  if (item.activityType === "LESSON") {
    const [courseId, lessonId] = (item.activityReference ?? "").split("|");
    if (courseId && lessonId) redirect(`/learn/${courseId}/lessons/${lessonId}`);
    redirect("/learn");
  }

  const exam = item.activityReference ? examSlugs[item.activityReference] : undefined;
  if (!exam) {
    // No exam context stored (shouldn't happen for these activity types
    // at generation time, but never dead-end the student) — fall back to
    // the existing subject/exam picker rather than throwing.
    redirect("/practice");
  }

  if (item.activityType === "PRACTICE_DRILL" || item.activityType === "REVIEW_MISTAKES") {
    const drillFormData = new FormData();
    drillFormData.set("exam", exam);
    drillFormData.set("subjectId", item.subjectId);
    drillFormData.set("topic", item.topic);
    await startTopicDrill(drillFormData); // redirects internally
    return;
  }

  // MOCK_EXAM study-plan items are single-subject (one row per subject),
  // unlike the platform's multi-subject "Full Mock" — the closest
  // existing equivalent is a single-subject CHALLENGE-purpose drill,
  // which is also how the scheduler originally sized this item's minutes
  // (see estimateMinutes in scheduler.ts).
  const mockFormData = new FormData();
  mockFormData.set("exam", exam);
  mockFormData.set("purpose", "CHALLENGE");
  mockFormData.append("subjects", item.subjectId);
  mockFormData.set("topic", item.topic);
  await startQuickDrill(mockFormData); // redirects internally
}
