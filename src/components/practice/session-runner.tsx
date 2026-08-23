"use client";

import { useEffect, useState, useTransition } from "react";
import type { QuestionOption } from "@/lib/practice-types";
import { saveAnswer, submitAttempt, toggleFlag } from "@/app/practice/actions";
import { PassageQuestionView, type PassageData } from "@/components/practice/passage-question-view";

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

function FlagIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${filled ? "fill-amber-400 text-amber-400" : "fill-none text-slate-500"}`}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      aria-hidden="true"
    >
      <path d="M5 3v18M5 4h11l-2.5 4L16 12H5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
        <p className="text-xs text-slate-500">
          Question {index + 1} of {total}
        </p>
        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={flagged}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
            flagged
              ? "border-amber-600 bg-amber-900/30 text-amber-300"
              : "border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
          }`}
        >
          <FlagIcon filled={flagged} />
          {flagged ? "Flagged" : "Flag for review"}
        </button>
      </div>

      <h1 className="mt-2 text-lg font-medium leading-relaxed">{question.prompt}</h1>

      <div className="mt-6 space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedOption === option.key;
          return (
            <button
              key={option.key}
              onClick={() => onSelect(option.key)}
              className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm ${
                isSelected
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className="font-semibold text-orange-400">{option.key}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-40"
        >
          Previous
        </button>

        {!isLast ? (
          <button
            onClick={onNext}
            className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={isPending}
            className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400 disabled:opacity-60 sm:hidden"
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
          <p className="text-xs text-slate-500">
            {answeredCount} / {questions.length} answered · {elapsed}
          </p>
        </div>
      }
    />
  );

  return (
    <div className="mx-auto flex max-w-5xl gap-6 px-6 py-8">
      <aside className="hidden w-48 shrink-0 sm:block">
        <p className="text-xs uppercase tracking-wide text-slate-500">{examLabel}</p>
        <p className="mt-1 text-sm text-slate-400">Elapsed: {elapsed}</p>
        <p className="mt-1 text-sm text-slate-400">
          {answeredCount} / {questions.length} answered
        </p>

        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.responseId}
              onClick={() => goTo(i)}
              className={`relative h-8 rounded text-xs font-medium ${
                i === index
                  ? "bg-orange-500 text-slate-950"
                  : answers[q.questionId]
                    ? "bg-green-900 text-green-300"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              {i + 1}
              {flags[q.questionId] && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="mt-6 w-full rounded-full bg-orange-500 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400 disabled:opacity-60"
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
