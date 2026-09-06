"use client";

import { useEffect, useState, useTransition } from "react";
import { AnswerOption } from "@/components/exam/answer-option";
import { MessageContent } from "@/components/ai-coach/message-content";
import { MathText } from "@/components/sat/math-text";
import { asOptions, type QuestionOption } from "@/lib/practice-types";

export type SatSessionItem = {
  itemId: string;
  passage: string | null;
  prompt: string;
  questionType: string; // "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE"
  options: unknown;
  selectedOption: string | null;
  numericAnswer: string | null;
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

/** Shared by Reading & Writing and Math practice — both are the same
 * shape (a set of published items, mostly MCQ), differing only in
 * whether a given item needs a numeric (student-produced-response)
 * input instead of options, and whether the prompt contains math
 * notation (rendered via the existing, already-general-purpose
 * MessageContent/KaTeX component either way — harmless no-op for plain
 * text). Open elapsed-time stopwatch, no countdown — countdown timers
 * are Mock Exam territory, a later phase. */
export function SatSessionRunner({
  attemptId,
  items,
  onSaveAnswer,
  onSubmit,
}: {
  attemptId: string;
  items: SatSessionItem[];
  onSaveAnswer: (itemId: string, answer: { selectedOption?: string; numericAnswer?: string }) => Promise<void>;
  onSubmit: (attemptId: string) => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries(items.map((i) => [i.itemId, i.selectedOption ?? i.numericAnswer]))
  );
  const [isPending, startTransition] = useTransition();
  const elapsed = useElapsedTime();

  const current = items[index];
  const isNumeric = current.questionType === "STUDENT_PRODUCED_RESPONSE";
  const options: QuestionOption[] = isNumeric ? [] : asOptions(current.options);
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const isLast = index === items.length - 1;

  function selectOption(optionKey: string) {
    setAnswers((prev) => ({ ...prev, [current.itemId]: optionKey }));
    startTransition(async () => {
      await onSaveAnswer(current.itemId, { selectedOption: optionKey });
    });
  }

  function saveNumericAnswer() {
    const value = (answers[current.itemId] ?? "").trim();
    if (!value) return;
    startTransition(async () => {
      await onSaveAnswer(current.itemId, { numericAnswer: value });
    });
  }

  function submit() {
    startTransition(async () => {
      await onSubmit(attemptId);
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

      {current.passage && (
        <div className="mt-4 rounded-xl border border-border bg-surface-raised p-6">
          <div className="prose-passage text-sm leading-7 text-text-secondary">{current.passage}</div>
        </div>
      )}

      <div className="mt-6 text-lg font-medium text-text-primary">
        <MessageContent content={current.prompt} />
      </div>

      {isNumeric ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={answers[current.itemId] ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [current.itemId]: e.target.value }))}
            placeholder="Enter your answer"
            className="w-40 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={saveNumericAnswer}
            disabled={isPending}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
          >
            Save answer
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2" role="list">
          {options.map((opt) => (
            <AnswerOption
              key={opt.key}
              optionKey={opt.key}
              state={answers[current.itemId] === opt.key ? "selected" : "default"}
              onClick={() => selectOption(opt.key)}
              disabled={isPending}
            >
              <MathText text={opt.text} />
            </AnswerOption>
          ))}
        </div>
      )}

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
