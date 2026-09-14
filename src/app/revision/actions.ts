"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudentSession } from "@/lib/exam-access";
import { startTopicDrill } from "@/app/practice/drills/actions";

const SESSION_SIZE = 10;

/** Reuses the existing attempt/question engine unchanged: this just
 * decides which already-legitimately-seen questions go into a normal
 * ExamAttempt (mode: REVISION) and hands off to the same
 * /practice/session/[attemptId] UI every other attempt uses. Because
 * every candidate question already came from the student's own prior
 * attempt history, this can never grant access to content they weren't
 * already entitled to — no new gate is needed or added. */
export async function startRevisionSession(formData: FormData) {
  const session = await requireStudentSession("/revision");
  const subjectId = (formData.get("subjectId") as string) || undefined;
  const topic = (formData.get("topic") as string) || undefined;
  // Only set by callers that need a guaranteed one-tap start even when
  // this exact topic has no Mistake Bank entries yet (Today's Study —
  // the scheduler assigns REVIEW_MISTAKES from aggregate topic-mastery
  // data, which doesn't guarantee an individual StudentRevisionItem
  // exists for that topic). Ignored otherwise.
  const fallbackExam = (formData.get("fallbackExam") as string) || undefined;

  const items = await prisma.studentRevisionItem.findMany({
    where: {
      userId: session.user.id,
      archived: false,
      status: { not: "MASTERED" },
      ...(subjectId ? { subjectId } : {}),
      ...(topic ? { topic } : {}),
    },
    orderBy: [{ priority: "desc" }, { lastMissedAt: "asc" }],
    take: SESSION_SIZE,
    select: { questionId: true, subjectId: true, exam: true },
  });

  if (items.length === 0) {
    if (fallbackExam && subjectId) {
      const drillFormData = new FormData();
      drillFormData.set("exam", fallbackExam);
      drillFormData.set("subjectId", subjectId);
      if (topic) drillFormData.set("topic", topic);
      await startTopicDrill(drillFormData); // redirects internally
      return;
    }
    redirect("/revision");
  }

  // ExamAttempt.exam is a single value — pick the exam most represented
  // among the selected items so the session stays coherent, rather than
  // splitting across exams. In practice a subject/topic-scoped session
  // is already single-exam almost always; this only matters for the
  // broader "revise everything due" queue.
  const examCounts = new Map<ExamType, number>();
  for (const item of items) examCounts.set(item.exam, (examCounts.get(item.exam) ?? 0) + 1);
  const dominantExam = [...examCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const matchingItems = items.filter((i) => i.exam === dominantExam);
  const subjectIds = [...new Set(matchingItems.map((i) => i.subjectId))];
  const questionIds = matchingItems.map((i) => i.questionId);

  const attempt = await prisma.examAttempt.create({
    data: {
      userId: session.user.id,
      exam: dominantExam,
      mode: "REVISION",
      totalItems: questionIds.length,
      subjects: { connect: subjectIds.map((id) => ({ id })) },
      responses: { create: questionIds.map((questionId, index) => ({ questionId, order: index })) },
    },
  });

  redirect(`/practice/session/${attempt.id}`);
}

/** "Don't prioritize this for future revision" — never a delete. History
 * (incorrectCount, review dates, and every past QuestionResponse) is
 * untouched; the item simply stops being selected by
 * startRevisionSession or counted in due-for-review totals. */
export async function archiveRevisionItem(formData: FormData) {
  const session = await requireStudentSession("/revision");
  const itemId = formData.get("itemId") as string;

  const item = await prisma.studentRevisionItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== session.user.id) {
    throw new Error("Revision item not found.");
  }

  await prisma.studentRevisionItem.update({ where: { id: itemId }, data: { archived: true } });
  revalidatePath("/revision");
  revalidatePath("/dashboard/student");
}
