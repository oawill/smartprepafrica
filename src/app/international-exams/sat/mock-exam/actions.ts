"use server";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSatEnabled } from "@/lib/sat/config";
import { recordAnswer } from "@/lib/sat/attempt-service";
import { createMockExamAttempt, startMockExamMathModule1, submitMockExamModule } from "@/lib/sat/mock-exam-service";
import type { SatSection } from "@prisma/client";

export async function startSatMockExam() {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const attemptId = await createMockExamAttempt(session.user.id);
  redirect(`/international-exams/sat/mock-exam/session/${attemptId}`);
}

export async function saveMockExamAnswer(itemId: string, answer: { selectedOption?: string; numericAnswer?: string }) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await recordAnswer(itemId, session.user.id, answer);
}

/** One call handles both Module 1 -> Module 2 routing and Module 2 ->
 * section scoring (and, for Math Module 2, finalizing the whole
 * attempt) — submitMockExamModule itself decides which, based on
 * `module`. The redirect always lands back on the session page, which
 * re-derives what to show next from the attempt's current state. */
export async function submitMockExamAttemptModule(attemptId: string, section: SatSection, module: 1 | 2) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await submitMockExamModule(attemptId, session.user.id, section, module);

  if (section === "MATH" && module === 2) {
    redirect(`/international-exams/sat/mock-exam/results/${attemptId}`);
  }
  redirect(`/international-exams/sat/mock-exam/session/${attemptId}`);
}

export async function startMockExamMathSection(attemptId: string) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await startMockExamMathModule1(attemptId, session.user.id);
  redirect(`/international-exams/sat/mock-exam/session/${attemptId}`);
}
