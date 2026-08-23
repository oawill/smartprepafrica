import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SessionRunner } from "@/components/practice/session-runner";
import { asOptions } from "@/lib/practice-types";
import { examLabels } from "@/lib/exam-slugs";

export default async function SessionPage({
  params,
}: PageProps<"/practice/session/[attemptId]">) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      responses: {
        orderBy: { order: "asc" },
        include: { question: { include: { passageGroup: true } } },
      },
    },
  });

  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/practice/results/${attempt.id}`);

  const questions = attempt.responses.map((r) => ({
    responseId: r.id,
    questionId: r.questionId,
    prompt: r.question.prompt,
    options: asOptions(r.question.options),
    selectedOption: r.selectedOption,
    flagged: r.flagged,
    passageGroupId: r.question.passageGroupId,
    passageLineRef: r.question.passageLineRef,
    passageLineStart: r.question.passageLineStart,
    passageLineEnd: r.question.passageLineEnd,
  }));

  const passages: Record<
    string,
    {
      id: string;
      type: string;
      title: string | null;
      instructions: string | null;
      bodyText: string;
      showLineNumbers: boolean;
      startingLineNumber: number;
    }
  > = {};
  for (const r of attempt.responses) {
    const pg = r.question.passageGroup;
    if (pg && !passages[pg.id]) {
      passages[pg.id] = {
        id: pg.id,
        type: pg.type,
        title: pg.title,
        instructions: pg.instructions,
        bodyText: pg.bodyText,
        showLineNumbers: pg.showLineNumbers,
        startingLineNumber: pg.startingLineNumber,
      };
    }
  }

  return (
    <SessionRunner
      attemptId={attempt.id}
      examLabel={examLabels[attempt.exam]}
      questions={questions}
      passages={passages}
    />
  );
}
