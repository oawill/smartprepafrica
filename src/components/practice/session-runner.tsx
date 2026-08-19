"use client";

import { useEffect, useState, useTransition } from "react";
import type { QuestionOption } from "@/lib/practice-types";
import { saveAnswer, submitAttempt } from "@/app/practice/actions";

type SessionQuestion = {
  responseId: string;
  questionId: string;
  prompt: string;
  options: QuestionOption[];
  selectedOption: string | null;
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

export function SessionRunner({
  attemptId,
  examLabel,
  questions,
}: {
  attemptId: string;
  examLabel: string;
  questions: SessionQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries(questions.map((q) => [q.questionId, q.selectedOption]))
  );
  const [isPending, startTransition] = useTransition();
  const elapsed = useElapsedTime();

  const current = questions[index];
  const answeredCount = Object.values(answers).filter(Boolean).length;

  function selectOption(questionId: string, option: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    startTransition(async () => {
      await saveAnswer(attemptId, questionId, option);
    });
  }

  function handleSubmit() {
    startTransition(async () => {
      await submitAttempt(attemptId);
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl gap-6 px-6 py-8">
      <aside className="hidden w-48 shrink-0 sm:block">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {examLabel}
        </p>
        <p className="mt-1 text-sm text-slate-400">Elapsed: {elapsed}</p>
        <p className="mt-1 text-sm text-slate-400">
          {answeredCount} / {questions.length} answered
        </p>

        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.responseId}
              onClick={() => setIndex(i)}
              className={`h-8 rounded text-xs font-medium ${
                i === index
                  ? "bg-orange-500 text-slate-950"
                  : answers[q.questionId]
                    ? "bg-green-900 text-green-300"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              {i + 1}
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

      <div className="flex-1">
        <p className="text-xs text-slate-500">
          Question {index + 1} of {questions.length}
        </p>
        <h1 className="mt-2 text-lg font-medium leading-relaxed">
          {current.prompt}
        </h1>

        <div className="mt-6 space-y-3">
          {current.options.map((option) => {
            const isSelected = answers[current.questionId] === option.key;
            return (
              <button
                key={option.key}
                onClick={() => selectOption(current.questionId, option.key)}
                className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm ${
                  isSelected
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
                }`}
              >
                <span className="font-semibold text-orange-400">
                  {option.key}
                </span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-40"
          >
            Previous
          </button>

          {index < questions.length - 1 ? (
            <button
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400 disabled:opacity-60 sm:hidden"
            >
              Submit
            </button>
          )}
        </div>

        <div className="mt-4 sm:hidden">
          <p className="text-xs text-slate-500">
            {answeredCount} / {questions.length} answered · {elapsed}
          </p>
        </div>
      </div>
    </div>
  );
}
