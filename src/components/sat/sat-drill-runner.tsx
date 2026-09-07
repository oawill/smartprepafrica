"use client";

import { useEffect, useState, useTransition } from "react";
import type { SatSection, Difficulty } from "@prisma/client";
import { AnswerOption } from "@/components/exam/answer-option";
import { MessageContent } from "@/components/ai-coach/message-content";
import { MathText } from "@/components/sat/math-text";
import { SatAskAi } from "@/components/sat/sat-ask-ai";
import { Badge } from "@/components/ui/badge";
import { asOptions, type QuestionOption } from "@/lib/practice-types";

export type SatDrillItem = {
  itemId: string;
  section: SatSection;
  domain: string;
  skill: string | null;
  difficulty: Difficulty;
  passage: string | null;
  imageUrl: string | null;
  prompt: string;
  questionType: string; // "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE"
  options: unknown;
  correctOption: string | null;
  correctValue: string | null;
  explanation: string | null;
  selectedOption: string | null;
  numericAnswer: string | null;
  isCorrect: boolean | null;
  flagged: boolean;
};

function useElapsedTime(enabled: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [enabled]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

/** Drill Mode's own session runner — a deliberate fork of
 * SatSessionRunner (following this codebase's own precedent, since
 * SatMockExamRunner already relates to SatSessionRunner the same way),
 * not an extension of it: zero shared risk surface with the 4 existing
 * pages (Reading & Writing, Math, Diagnostic, Mock Exam) that depend on
 * the two existing runners. Adds what neither existing runner has:
 * immediate reveal after each answer (correct/incorrect, explanation,
 * skill, difficulty), an inline Ask AI Tutor + Practice Another Like
 * This, an optional timer, and an exit-early affordance. */
export function SatDrillRunner({
  attemptId,
  items: initialItems,
  initialIndex = 0,
  timerEnabled,
  onSaveAnswer,
  onSubmit,
  onToggleFlag,
  onPracticeAnother,
}: {
  attemptId: string;
  items: SatDrillItem[];
  initialIndex?: number;
  timerEnabled: boolean;
  onSaveAnswer: (
    itemId: string,
    answer: { selectedOption?: string; numericAnswer?: string }
  ) => Promise<{ isCorrect: boolean | null }>;
  onSubmit: (attemptId: string) => Promise<void>;
  onToggleFlag?: (itemId: string) => Promise<void>;
  onPracticeAnother: (itemId: string) => Promise<SatDrillItem | null>;
}) {
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries(initialItems.map((i) => [i.itemId, i.selectedOption ?? i.numericAnswer]))
  );
  const [results, setResults] = useState<Record<string, boolean | null>>(
    Object.fromEntries(initialItems.map((i) => [i.itemId, i.isCorrect]))
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>(
    Object.fromEntries(initialItems.map((i) => [i.itemId, i.isCorrect !== null]))
  );
  const [flagged, setFlagged] = useState<Record<string, boolean>>(
    Object.fromEntries(initialItems.map((i) => [i.itemId, i.flagged]))
  );
  const [saveFailed, setSaveFailed] = useState<Record<string, boolean>>({});
  const [practiceAnotherLoading, setPracticeAnotherLoading] = useState(false);
  const [noSimilarQuestion, setNoSimilarQuestion] = useState(false);
  const [isPending, startTransition] = useTransition();
  const elapsed = useElapsedTime(timerEnabled);

  const current = items[index];
  const isNumeric = current.questionType === "STUDENT_PRODUCED_RESPONSE";
  const options: QuestionOption[] = isNumeric ? [] : asOptions(current.options);
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const isLast = index === items.length - 1;
  const isRevealed = revealed[current.itemId];

  function toggleFlag() {
    if (!onToggleFlag) return;
    setFlagged((prev) => ({ ...prev, [current.itemId]: !prev[current.itemId] }));
    startTransition(async () => {
      await onToggleFlag(current.itemId);
    });
  }

  function persistAnswer(itemId: string, answer: { selectedOption?: string; numericAnswer?: string }) {
    startTransition(async () => {
      try {
        const result = await onSaveAnswer(itemId, answer);
        setSaveFailed((prev) => ({ ...prev, [itemId]: false }));
        setResults((prev) => ({ ...prev, [itemId]: result.isCorrect }));
        setRevealed((prev) => ({ ...prev, [itemId]: true }));
      } catch {
        setSaveFailed((prev) => ({ ...prev, [itemId]: true }));
      }
    });
  }

  function selectOption(optionKey: string) {
    if (isRevealed) return;
    setAnswers((prev) => ({ ...prev, [current.itemId]: optionKey }));
    persistAnswer(current.itemId, { selectedOption: optionKey });
  }

  function saveNumericAnswer() {
    const value = (answers[current.itemId] ?? "").trim();
    if (!value) return;
    persistAnswer(current.itemId, { numericAnswer: value });
  }

  function retrySave() {
    const value = answers[current.itemId];
    if (!value) return;
    if (isNumeric) {
      persistAnswer(current.itemId, { numericAnswer: value });
    } else {
      persistAnswer(current.itemId, { selectedOption: value });
    }
  }

  async function practiceAnother() {
    setPracticeAnotherLoading(true);
    setNoSimilarQuestion(false);
    try {
      const newItem = await onPracticeAnother(current.itemId);
      if (!newItem) {
        setNoSimilarQuestion(true);
        return;
      }
      setItems((prev) => [...prev, newItem]);
      setAnswers((prev) => ({ ...prev, [newItem.itemId]: null }));
      setResults((prev) => ({ ...prev, [newItem.itemId]: null }));
      setRevealed((prev) => ({ ...prev, [newItem.itemId]: false }));
      setFlagged((prev) => ({ ...prev, [newItem.itemId]: false }));
      setIndex(items.length); // items state hasn't updated yet at this point in the closure — this is the index the new item will land at
    } finally {
      setPracticeAnotherLoading(false);
    }
  }

  function finishDrill() {
    startTransition(async () => {
      await onSubmit(attemptId);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          Question {index + 1} of {items.length}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {answeredCount} / {items.length} answered
            {timerEnabled && ` · ${elapsed}`}
          </span>
          {onToggleFlag && (
            <button
              type="button"
              onClick={toggleFlag}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${
                flagged[current.itemId]
                  ? "border-warning/50 bg-warning-surface text-warning"
                  : "border-border-strong text-text-secondary hover:border-text-muted"
              }`}
            >
              {flagged[current.itemId] ? "🚩 Flagged" : "Flag for review"}
            </button>
          )}
          <button
            type="button"
            onClick={finishDrill}
            disabled={isPending}
            className="shrink-0 rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-secondary hover:border-text-muted disabled:opacity-50"
          >
            End drill now
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${((index + 1) / items.length) * 100}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
        <Badge tone="neutral">{current.domain}</Badge>
        {current.skill && <Badge tone="neutral">{current.skill}</Badge>}
        <Badge tone="neutral">{DIFFICULTY_LABEL[current.difficulty]}</Badge>
      </div>

      {current.passage && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface-raised p-4 sm:p-6">
          <div className="prose-passage text-sm leading-7 text-text-secondary">{current.passage}</div>
        </div>
      )}

      {current.imageUrl && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface-raised p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.imageUrl} alt="Question figure" className="mx-auto max-w-full" />
        </div>
      )}

      <div className="mt-6 overflow-x-auto text-lg font-medium text-text-primary">
        <MessageContent content={current.prompt} />
      </div>

      {saveFailed[current.itemId] && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-danger/40 bg-danger-surface px-3 py-2 text-xs text-danger">
          <span>Your last answer didn&apos;t save — check your connection.</span>
          <button type="button" onClick={retrySave} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {isNumeric ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={answers[current.itemId] ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [current.itemId]: e.target.value }))}
            placeholder="Enter your answer"
            disabled={isRevealed}
            className="w-40 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand disabled:opacity-70"
          />
          {!isRevealed && (
            <button
              type="button"
              onClick={saveNumericAnswer}
              disabled={isPending}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
            >
              Save answer
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2" role="list">
          {options.map((opt) => {
            const state = isRevealed
              ? opt.key === current.correctOption
                ? "correct"
                : opt.key === answers[current.itemId]
                  ? "incorrect"
                  : "default"
              : answers[current.itemId] === opt.key
                ? "selected"
                : "default";
            return (
              <AnswerOption
                key={opt.key}
                optionKey={opt.key}
                state={state}
                onClick={() => selectOption(opt.key)}
                disabled={isPending || isRevealed}
              >
                <MathText text={opt.text} />
              </AnswerOption>
            );
          })}
        </div>
      )}

      {isRevealed && (
        <div className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
          <p className={`text-sm font-semibold ${results[current.itemId] ? "text-success" : "text-danger"}`}>
            {results[current.itemId] ? "Correct" : "Incorrect"}
          </p>
          {isNumeric && !results[current.itemId] && current.correctValue && (
            <p className="mt-1 text-sm text-text-secondary">Correct answer: {current.correctValue}</p>
          )}
          {current.explanation && (
            <div className="mt-2 text-sm text-text-secondary">
              <MessageContent content={current.explanation} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <SatAskAi
              section={current.section}
              domain={current.domain}
              passage={current.passage}
              prompt={current.prompt}
              options={current.options}
              correctOption={current.correctOption}
              correctValue={current.correctValue}
              selectedOption={answers[current.itemId]}
              numericAnswer={isNumeric ? answers[current.itemId] : null}
              explanation={current.explanation}
              triggerLabel="Ask AI Tutor"
            />
            <button
              type="button"
              onClick={practiceAnother}
              disabled={practiceAnotherLoading}
              className="rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-text-muted disabled:opacity-50"
            >
              {practiceAnotherLoading ? "Finding a question…" : "Practice Another Like This"}
            </button>
          </div>
          {noSimilarQuestion && (
            <p className="mt-2 text-xs text-text-muted">No more similar questions are available right now.</p>
          )}
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
            onClick={finishDrill}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            Finish Drill
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
