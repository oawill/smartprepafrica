import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSatEnabled } from "@/lib/sat/config";
import { SatSessionRunner } from "@/components/sat/sat-session-runner";
import { saveDiagnosticAnswer, submitSatDiagnostic } from "@/app/international-exams/sat/diagnostic/actions";
import { toggleSatFlag } from "@/app/international-exams/sat/shared-actions";
import { firstUnansweredIndex } from "@/lib/sat/session-helpers";

export default async function SatDiagnosticSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/sat/diagnostic/results/${attemptId}`);

  const items = attempt.items.map((item) => ({
    itemId: item.id,
    passage: item.content.passage,
    prompt: item.content.prompt,
    questionType: item.content.questionType,
    options: item.content.options,
    selectedOption: item.selectedOption,
    numericAnswer: item.numericAnswer,
    flagged: item.flagged,
  }));

  return (
    <SatSessionRunner
      attemptId={attempt.id}
      items={items}
      initialIndex={firstUnansweredIndex(items)}
      onSaveAnswer={saveDiagnosticAnswer}
      onSubmit={submitSatDiagnostic}
      onToggleFlag={toggleSatFlag}
    />
  );
}
