import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled, TOEFL_CONFIG } from "@/lib/toefl/config";
import {
  DiagnosticRunner,
  type DiagnosticMcqItem,
  type DiagnosticWritingItem,
  type DiagnosticSpeakingItem,
} from "@/components/toefl/diagnostic-runner";

export default async function ToeflDiagnosticSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/toefl/diagnostic/results/${attemptId}`);

  const mcqItems: DiagnosticMcqItem[] = attempt.items
    .filter((i) => i.content.skill === "READING" || i.content.skill === "LISTENING")
    .map((i) => ({
      itemId: i.id,
      passage: i.content.passage,
      audioUrl: i.content.audioUrl,
      prompt: i.content.prompt,
      options: i.content.options,
      selectedOption: i.selectedOption,
    }));

  const writingRow = attempt.items.find((i) => i.content.skill === "WRITING");
  const { timeSec, minWords } = TOEFL_CONFIG.sections.WRITING;
  const writingItem: DiagnosticWritingItem | null = writingRow
    ? {
        itemId: writingRow.id,
        prompt: writingRow.content.prompt,
        initialText: writingRow.writingText ?? "",
        timeSec: timeSec ?? 1800,
        minWords: minWords ?? 300,
      }
    : null;

  const speakingRow = attempt.items.find((i) => i.content.skill === "SPEAKING");
  const { prepTimeSec, recordTimeSec } = TOEFL_CONFIG.sections.SPEAKING;
  const speakingItem: DiagnosticSpeakingItem | null = speakingRow
    ? {
        itemId: speakingRow.id,
        prompt: speakingRow.content.prompt,
        prepTimeSec: prepTimeSec ?? 15,
        recordTimeSec: recordTimeSec ?? 45,
      }
    : null;

  return (
    <DiagnosticRunner
      attemptId={attempt.id}
      mcqItems={mcqItems}
      writingItem={writingItem}
      speakingItem={speakingItem}
    />
  );
}
