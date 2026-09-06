import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { SAT_SECTION_LABELS } from "@/lib/sat/types";
import { SatMockExamRunner } from "@/components/sat/sat-mock-exam-runner";
import {
  saveMockExamAnswer,
  submitMockExamAttemptModule,
  startMockExamMathSection,
} from "@/app/international-exams/sat/mock-exam/actions";
import { toggleSatFlag } from "@/app/international-exams/sat/shared-actions";

export default async function SatMockExamSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/sat/mock-exam/results/${attemptId}`);

  const rwItems = attempt.items.filter((i) => i.content.section === "READING_WRITING");
  const mathItems = attempt.items.filter((i) => i.content.section === "MATH");
  const rwM1 = rwItems.filter((i) => i.module === 1);
  const rwM2 = rwItems.filter((i) => i.module === 2);
  const mathM1 = mathItems.filter((i) => i.module === 1);
  const mathM2 = mathItems.filter((i) => i.module === 2);

  function toRunnerItems(items: typeof rwItems) {
    return items.map((item) => ({
      itemId: item.id,
      passage: item.content.passage,
      prompt: item.content.prompt,
      questionType: item.content.questionType,
      options: item.content.options,
      selectedOption: item.selectedOption,
      numericAnswer: item.numericAnswer,
      flagged: item.flagged,
    }));
  }

  // R&W is done once its composite section score is set — submitting
  // Module 2 is what sets it. Until then, we're always in R&W: Module 2
  // if it exists, otherwise Module 1 (always created at attempt start).
  if (attempt.readingWritingScore === null) {
    const inModule2 = rwM2.length > 0;
    async function handleSubmit(attemptIdArg: string) {
      "use server";
      await submitMockExamAttemptModule(attemptIdArg, "READING_WRITING", inModule2 ? 2 : 1);
    }
    return (
      <SatMockExamRunner
        attemptId={attempt.id}
        moduleLabel={`${SAT_SECTION_LABELS.READING_WRITING} — Module ${inModule2 ? 2 : 1}`}
        timeLimitSec={SAT_CONFIG.mockExam.moduleTimeLimitSec}
        items={toRunnerItems(inModule2 ? rwM2 : rwM1)}
        onSaveAnswer={saveMockExamAnswer}
        onSubmitModule={handleSubmit}
        onToggleFlag={toggleSatFlag}
      />
    );
  }

  // R&W is scored. Once Math is also scored, submitMockExamAttemptModule
  // itself redirects to results, so reaching here with mathScore set is
  // not expected in normal flow — but redirect defensively rather than
  // render a dead end.
  if (attempt.mathScore !== null) {
    redirect(`/international-exams/sat/mock-exam/results/${attemptId}`);
  }

  if (mathM1.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Break</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Reading and Writing is complete. Take a short break, then start the Math section when you&apos;re ready.
        </p>
        <div className="mt-8">
          <Card>
            <form action={startMockExamMathSection.bind(null, attemptId)}>
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Start Math Section
              </button>
            </form>
          </Card>
        </div>
        <Link
          href="/international-exams/sat"
          className="mt-6 inline-block text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to SAT overview
        </Link>
      </div>
    );
  }

  const mathInModule2 = mathM2.length > 0;
  async function handleSubmitMath(attemptIdArg: string) {
    "use server";
    await submitMockExamAttemptModule(attemptIdArg, "MATH", mathInModule2 ? 2 : 1);
  }
  return (
    <SatMockExamRunner
      attemptId={attempt.id}
      moduleLabel={`${SAT_SECTION_LABELS.MATH} — Module ${mathInModule2 ? 2 : 1}`}
      timeLimitSec={SAT_CONFIG.mockExam.moduleTimeLimitSec}
      items={toRunnerItems(mathInModule2 ? mathM2 : mathM1)}
      onSaveAnswer={saveMockExamAnswer}
      onSubmitModule={handleSubmitMath}
      onToggleFlag={toggleSatFlag}
    />
  );
}
