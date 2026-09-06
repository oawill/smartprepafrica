"use client";

import { useEffect, useState, useTransition } from "react";
import { AnswerOption } from "@/components/exam/answer-option";
import { asOptions, type QuestionOption } from "@/lib/practice-types";
import { saveReadingAnswer, submitReadingAttempt } from "@/app/international-exams/toefl/reading/actions";

export type ReadingSessionItem = {
  itemId: string;
  passage: string;
  prompt: string;
  options: unknown;
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

export function ReadingSessionRunner({ attemptId, items }: { attemptId: string; items: ReadingSessionItem[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries(items.map((i) => [i.itemId, i.selectedOption]))
  );
  const [isPending, startTransition] = useTransition();
  const elapsed = useElapsedTime();

  const current = items[index];
  const options: QuestionOption[] = asOptions(current.options);
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const isLast = index === items.length - 1;

  function select(optionKey: string) {
    setAnswers((prev) => ({ ...prev, [current.itemId]: optionKey }));
    startTransition(async () => {
      await saveReadingAnswer(current.itemId, optionKey);
    });
  }

  function submit() {
    startTransition(async () => {
      await submitReadingAttempt(attemptId);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          Question {index + 1} of {items.length}
        </span>
        <span>
          {answeredCount} / {items.length} answered · {elapsed}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-raised p-6">
        <div className="prose-passage text-sm leading-7 text-text-secondary">{current.passage}</div>
      </div>

      <h2 className="mt-6 text-lg font-medium text-text-primary">{current.prompt}</h2>

      <div className="mt-4 space-y-2" role="list">
        {options.map((opt) => (
          <AnswerOption
            key={opt.key}
            optionKey={opt.key}
            state={answers[current.itemId] === opt.key ? "selected" : "default"}
            onClick={() => select(opt.key)}
            disabled={isPending}
          >
            {opt.text}
          </AnswerOption>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
        >
          Previous
        </button>
        {isLast ? (
          <button
            type="button"
            disabled={isPending}
            onClick={submit}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
