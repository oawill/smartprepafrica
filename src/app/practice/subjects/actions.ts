"use server";

import { redirect } from "next/navigation";
import type { ExamType } from "@prisma/client";
import { requireStudentSession } from "@/lib/exam-access";
import { saveExamProfile, getCompulsorySubjectNames } from "@/lib/practice/exam-profile-service";
import { prisma } from "@/lib/prisma";
import { examSlugFor } from "@/lib/exam-slugs";

export async function saveExamSubjects(formData: FormData) {
  const session = await requireStudentSession();
  const exam = formData.get("exam") as ExamType;
  const subjectIds = new Set(formData.getAll("subjects") as string[]);

  // Compulsory subjects (e.g. UTME's English Language) are always included
  // server-side too, not just disabled client-side — a disabled checkbox
  // is a UI nicety, not the actual guarantee.
  const compulsoryNames = await getCompulsorySubjectNames(exam);
  if (compulsoryNames.length > 0) {
    const compulsorySubjects = await prisma.subject.findMany({
      where: { name: { in: compulsoryNames } },
      select: { id: true },
    });
    for (const s of compulsorySubjects) subjectIds.add(s.id);
  }

  if (subjectIds.size === 0) {
    throw new Error("Select at least one subject to continue.");
  }

  await saveExamProfile(session.user.id, exam, [...subjectIds]);
  redirect(`/practice/${examSlugFor(exam)}/readiness?subjectsSaved=${subjectIds.size}`);
}
