"use client";

import { useState } from "react";
import Link from "next/link";
import { PassageQuestionView, type PassageData } from "@/components/practice/passage-question-view";
import { QuestionAnswerPanel, type SessionQuestion } from "@/components/practice/session-runner";

/** Read-only student-experience preview for admins — reuses the exact same
 * PassageQuestionView/QuestionAnswerPanel components students see, but with
 * local-only state (no saveAnswer calls, no ExamAttempt created). */
export function PassagePreview({
  passageGroupId,
  passage,
  questions,
}: {
  passageGroupId: string;
  passage: PassageData;
  questions: SessionQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const current = questions[index];

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(questions.length - 1, i)));
  }

  const answerPanel = (
    <QuestionAnswerPanel
      question={current}
      selectedOption={answers[current.questionId] ?? null}
      onSelect={(option) => setAnswers((prev) => ({ ...prev, [current.questionId]: option }))}
      flagged={!!flags[current.questionId]}
      onToggleFlag={() =>
        setFlags((prev) => ({ ...prev, [current.questionId]: !prev[current.questionId] }))
      }
      index={index}
      total={questions.length}
      onPrev={() => goTo(index - 1)}
      onNext={() => goTo(index + 1)}
      isLast={index === questions.length - 1}
      onSubmit={() => {}}
      isPending={false}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-text-secondary">
          Preview only — answers are not saved
        </span>
        <Link
          href={`/dashboard/admin/passages/${passageGroupId}`}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to passage
        </Link>
      </div>
      <PassageQuestionView
        passage={passage}
        questions={questions}
        currentQuestion={current}
        answers={answers}
        flags={flags}
        onNavigate={goTo}
        answerPanel={answerPanel}
      />
    </div>
  );
}
