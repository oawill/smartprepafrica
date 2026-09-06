import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled, TOEFL_CONFIG } from "@/lib/toefl/config";
import { SpeakingRecorder } from "@/components/toefl/speaking-recorder";

export default async function ToeflSpeakingSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/toefl/speaking/results/${attemptId}`);

  const item = attempt.items[0];
  if (!item) notFound();

  const { prepTimeSec, recordTimeSec } = TOEFL_CONFIG.sections.SPEAKING;

  return (
    <SpeakingRecorder
      itemId={item.id}
      prompt={item.content.prompt}
      prepTimeSec={prepTimeSec ?? 15}
      recordTimeSec={recordTimeSec ?? 45}
    />
  );
}
