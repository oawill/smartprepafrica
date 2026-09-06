import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled, TOEFL_CONFIG } from "@/lib/toefl/config";
import { WritingEditor } from "@/components/toefl/writing-editor";

export default async function ToeflWritingSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/toefl/writing/results/${attemptId}`);

  const item = attempt.items[0];
  if (!item) notFound();

  const { timeSec, minWords } = TOEFL_CONFIG.sections.WRITING;

  return (
    <WritingEditor
      attemptId={attempt.id}
      itemId={item.id}
      prompt={item.content.prompt}
      startedAt={attempt.startedAt.toISOString()}
      timeSec={timeSec ?? 1800}
      minWords={minWords ?? 300}
      initialText={item.writingText ?? ""}
    />
  );
}
