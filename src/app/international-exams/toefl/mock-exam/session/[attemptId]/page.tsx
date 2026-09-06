import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled, TOEFL_CONFIG } from "@/lib/toefl/config";
import { ExamRunner, type ExamMcqItem, type ExamWritingItem, type ExamSpeakingItem } from "@/components/toefl/diagnostic-runner";
import {
  saveMockExamAnswer,
  saveMockExamSpeakingRecording,
  submitMockExamSpeakingRecording,
  finalizeMockExam,
} from "@/app/international-exams/toefl/mock-exam/actions";

export default async function ToeflMockExamSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/toefl/mock-exam/results/${attemptId}`);

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
      mcqTimeLimitSec={TOEFL_CONFIG.sections.READING.defaultTimeSec}
      writingItems={writingItems}
      speakingItems={speakingItems}
      onSaveAnswer={saveMockExamAnswer}
      onSaveSpeaking={saveMockExamSpeakingRecording}
      onSubmitSpeaking={submitMockExamSpeakingRecording}
      onFinalize={finalizeMockExam}
    />
  );
}
