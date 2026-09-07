import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled, TOEFL_CONFIG } from "@/lib/toefl/config";
import { ExamRunner, type ExamMcqItem, type ExamWritingItem, type ExamSpeakingItem } from "@/components/toefl/diagnostic-runner";
import {
  saveDiagnosticAnswer,
  submitDiagnosticSpeakingRecording,
  finalizeDiagnosticAttempt,
} from "@/app/international-exams/toefl/diagnostic/actions";

export default async function ToeflDiagnosticSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const { attemptId } = await params;
  const session = await requireStudentSession(`/international-exams/toefl/diagnostic/session/${attemptId}`);
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/toefl/diagnostic/results/${attemptId}`);

  const mcqItems: ExamMcqItem[] = attempt.items
    .filter((i) => i.content.skill === "READING" || i.content.skill === "LISTENING")
    .map((i) => ({
      itemId: i.id,
      passage: i.content.passage,
      audioUrl: i.content.audioUrl,
      prompt: i.content.prompt,
      options: i.content.options,
      selectedOption: i.selectedOption,
    }));

  const { timeSec, minWords } = TOEFL_CONFIG.sections.WRITING;
  const writingItems: ExamWritingItem[] = attempt.items
    .filter((i) => i.content.skill === "WRITING")
    .map((i) => ({
      itemId: i.id,
      prompt: i.content.prompt,
      initialText: i.writingText ?? "",
      timeSec: timeSec ?? 1800,
      minWords: minWords ?? 300,
    }));

  const { prepTimeSec, recordTimeSec } = TOEFL_CONFIG.sections.SPEAKING;
  const speakingItems: ExamSpeakingItem[] = attempt.items
    .filter((i) => i.content.skill === "SPEAKING")
    .map((i) => ({
      itemId: i.id,
      prompt: i.content.prompt,
      prepTimeSec: prepTimeSec ?? 15,
      recordTimeSec: recordTimeSec ?? 45,
    }));

  return (
    <ExamRunner
      attemptId={attempt.id}
      startedAt={attempt.startedAt.toISOString()}
      mcqItems={mcqItems}
      writingItems={writingItems}
      speakingItems={speakingItems}
      onSaveAnswer={saveDiagnosticAnswer}
      onSaveSpeaking={submitDiagnosticSpeakingRecording}
      onSubmitSpeaking={submitDiagnosticSpeakingRecording}
      onFinalize={finalizeDiagnosticAttempt}
    />
  );
}
