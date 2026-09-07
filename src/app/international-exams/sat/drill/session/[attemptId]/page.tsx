import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSatEnabled } from "@/lib/sat/config";
import { SatDrillRunner, type SatDrillItem } from "@/components/sat/sat-drill-runner";
import { saveDrillAnswer, submitDrill, practiceAnother } from "@/app/international-exams/sat/drill/actions";
import { toggleSatFlag } from "@/app/international-exams/sat/shared-actions";
import { firstUnansweredIndex } from "@/lib/sat/session-helpers";

export default async function SatDrillSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ timer?: string }>;
}) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;
  const { timer } = await searchParams;

  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id || attempt.kind !== "DRILL") notFound();
  if (attempt.submittedAt) redirect(`/international-exams/sat/drill/results/${attemptId}`);

  const items: SatDrillItem[] = attempt.items.map((item) => ({
    itemId: item.id,
    section: item.content.section,
    domain: item.content.domain,
    skill: item.content.skill,
    difficulty: item.content.difficulty,
    passage: item.content.passage,
    imageUrl: item.content.imageUrl,
    prompt: item.content.prompt,
    questionType: item.content.questionType,
    options: item.content.options,
    correctOption: item.content.correctOption,
    correctValue: item.content.correctValue,
    explanation: item.content.explanation,
    selectedOption: item.selectedOption,
    numericAnswer: item.numericAnswer,
    isCorrect: item.isCorrect,
    flagged: item.flagged,
  }));

  return (
    <SatDrillRunner
      attemptId={attempt.id}
      items={items}
      initialIndex={firstUnansweredIndex(items)}
      timerEnabled={timer === "on"}
      onSaveAnswer={saveDrillAnswer}
      onSubmit={submitDrill}
      onToggleFlag={toggleSatFlag}
      onPracticeAnother={practiceAnother}
    />
  );
}
