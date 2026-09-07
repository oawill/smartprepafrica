import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled } from "@/lib/toefl/config";
import { ReadingSessionRunner } from "@/components/toefl/reading-session-runner";

export default async function ToeflReadingSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const { attemptId } = await params;
  const session = await requireStudentSession(`/international-exams/toefl/reading/session/${attemptId}`);
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/toefl/reading/results/${attemptId}`);

  const items = attempt.items.map((item) => ({
    itemId: item.id,
    passage: item.content.passage ?? "",
    prompt: item.content.prompt,
    options: item.content.options,
    selectedOption: item.selectedOption,
  }));

  return <ReadingSessionRunner attemptId={attempt.id} items={items} />;
}
