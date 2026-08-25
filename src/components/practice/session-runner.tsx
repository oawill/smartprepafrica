"use client";

import { useEffect, useState, useTransition } from "react";
import type { QuestionOption } from "@/lib/practice-types";
import { saveAnswer, submitAttempt, toggleFlag } from "@/app/practice/actions";
import { PassageQuestionView, type PassageData } from "@/components/practice/passage-question-view";
import { AnswerOption } from "@/components/exam/answer-option";
import { FlagIcon } from "@/components/ui/icons";

export type SessionQuestion = {
  responseId: string;
  questionId: string;
  prompt: string;
  options: QuestionOption[];
  selectedOption: string | null;
  flagged: boolean;
  passageGroupId: string | null;
  passageLineRef: string | null;
  passageLineStart: number | null;
  passageLineEnd: number | null;
};

function useElapsedTime() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function QuestionAnswerPanel({
  question,
  selectedOption,
  onSelect,
  flagged,
  onToggleFlag,
  index,
  total,
  onPrev,
  onNext,
  isLast,
  onSubmit,
  isPending,
  mobileFooter,
}: {
  question: SessionQuestion;
  selectedOption: string | null;
  onSelect: (option: string) => void;
  flagged: boolean;
  onToggleFlag: () => void;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  isLast: boolean;
  onSubmit: () => void;
  isPending: boolean;
  mobileFooter?: React.ReactNode;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-text-muted">
          Question {index + 1} of {total}
        </p>
        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={flagged}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
            flagged
              ? "border-warning/50 bg-warning-surface text-warning"
              : "border-border text-text-muted hover:border-border-strong hover:text-text-secondary"
          }`}
        >
          <FlagIcon filled={flagged} />
          {flagged ? "Flagged" : "Flag for review"}
        </button>
      </div>

      <h1 className="mt-2 text-question font-medium leading-relaxed text-text-primary">{question.prompt}</h1>

      <div className="mt-6 space-y-3" role="list">
        {question.options.map((option) => (
          <AnswerOption
            key={option.key}
            optionKey={option.key}
            state={selectedOption === option.key ? "selected" : "default"}
            onClick={() => onSelect(option.key)}
          >
            <span className="text-answer">{option.text}</span>
          </AnswerOption>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-full border border-border-strong px-5 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-40"
        >
          Previous
        </button>

        {!isLast ? (
          <button
            onClick={onNext}
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={isPending}
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-60 sm:hidden"
          >
            Submit
          </button>
        )}
      </div>

      {mobileFooter}
    </div>
  );
}

export function SessionRunner({
  attemptId,
  examLabel,
  questions,
  passages,
}: {
  attemptId: string;
  examLabel: string;
  questions: SessionQuestion[];
  passages: Record<string, PassageData>;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries(questions.map((q) => [q.questionId, q.selectedOption]))
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(questions.map((q) => [q.questionId, q.flagged]))
  );
  const [isPending, startTransition] = useTransition();
  const elapsed = useElapsedTime();

  const current = questions[index];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const currentPassage = current.passageGroupId ? passages[current.passageGroupId] : null;

  function selectOption(questionId: string, option: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    startTransition(async () => {
      await saveAnswer(attemptId, questionId, option);
    });
  }

  function toggleFlagLocal(questionId: string) {
    const next = !flags[questionId];
    setFlags((prev) => ({ ...prev, [questionId]: next }));
    startTransition(async () => {
      await toggleFlag(attemptId, questionId, next);
    });
  }

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(questions.length - 1, i)));
  }

  function handleSubmit() {
    startTransition(async () => {
      await submitAttempt(attemptId);
    });
  }

  const answerPanel = (
    <QuestionAnswerPanel
      question={current}
      selectedOption={answers[current.questionId]}
      onSelect={(option) => selectOption(current.questionId, option)}
      flagged={!!flags[current.questionId]}
      onToggleFlag={() => toggleFlagLocal(current.questionId)}
      index={index}
      total={questions.length}
      onPrev={() => goTo(index - 1)}
      onNext={() => goTo(index + 1)}
      isLast={index === questions.length - 1}
      onSubmit={handleSubmit}
      isPending={isPending}
      mobileFooter={
        <div className="mt-4 sm:hidden">
          <p className="text-xs text-text-secondary">
            {answeredCount} / {questions.length} answered · {elapsed}
          </p>
        </div>
      }
    />
  );

  return (
    <div className="mx-auto flex max-w-5xl gap-6 px-6 py-8">
      <aside className="hidden w-48 shrink-0 sm:block">
        <p className="text-xs uppercase tracking-wide text-text-muted">{examLabel}</p>
        <p className="mt-1 text-sm text-text-secondary">Elapsed: {elapsed}</p>
        <p className="mt-1 text-sm text-text-secondary">
          {answeredCount} / {questions.length} answered
        </p>

        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {questions.map((q, i) => {
            const isAnswered = !!answers[q.questionId];
            const isFlagged = flags[q.questionId];
            const status = i === index ? "current" : isAnswered ? "answered" : "unanswered";
            return (
              <button
                key={q.responseId}
                onClick={() => goTo(i)}
                aria-label={`Question ${i + 1}, ${status}${isFlagged ? ", flagged" : ""}`}
                className={`relative h-8 rounded text-xs font-medium ${
                  status === "current"
                    ? "bg-exam-palette-current text-brand-foreground"
                    : status === "answered"
                      ? "bg-exam-palette-answered text-exam-palette-answered-text"
                      : "bg-exam-palette-unanswered text-exam-palette-unanswered-text"
                }`}
              >
                {i + 1}
                {isFlagged && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-exam-flagged"
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="mt-6 w-full rounded-full bg-brand py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
        >
          Submit
        </button>
      </aside>

      {currentPassage ? (
        <PassageQuestionView
          passage={currentPassage}
          questions={questions}
          currentQuestion={current}
          answers={answers}
          flags={flags}
          onNavigate={goTo}
          answerPanel={answerPanel}
        />
      ) : (
        answerPanel
      )}
    </div>
  );
}
