"use client";

import { useEffect, useState, useTransition } from "react";
import { AnswerOption } from "@/components/exam/answer-option";
import { AudioPlayer } from "@/components/toefl/audio-player";
import { WritingEditor } from "@/components/toefl/writing-editor";
import { SpeakingRecorder } from "@/components/toefl/speaking-recorder";
import { asOptions, type QuestionOption } from "@/lib/practice-types";

export type ExamMcqItem = {
  itemId: string;
  passage: string | null;
  audioUrl: string | null;
  prompt: string;
  options: unknown;
  selectedOption: string | null;
};

export type ExamWritingItem = {
  itemId: string;
  prompt: string;
  initialText: string;
  timeSec: number;
  minWords: number;
};

export type ExamSpeakingItem = {
  itemId: string;
  prompt: string;
  prepTimeSec: number;
  recordTimeSec: number;
};

type Phase = "mcq" | "writing" | "speaking";

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

/** Server-anchored countdown from a fixed deadline, same shape as
 * WritingEditor's own countdown — recomputed from the real deadline every
 * tick, not decremented client-side, so a refresh can't grant extra time.
 * Calls onExpire once when it first reaches zero. */
function useCountdown(deadline: number, onExpire: () => void) {
  const [remainingMs, setRemainingMs] = useState(() => deadline - Date.now());
  useEffect(() => {
    const expired = { current: false };
    const interval = setInterval(() => {
      const remaining = deadline - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0 && !expired.current) {
        expired.current = true;
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Shared by Diagnostic (Step 9) and Mock Exam (Step 10) — same phase
 * machine (mcq -> writing -> speaking), differing only in whether the
 * MCQ phase is hard-timed and how many Writing/Speaking items it walks
 * through. Diagnostic passes mcqTimeLimitSec: null (today's open
 * elapsed-time stopwatch, unchanged) and 0-or-1-length writing/speaking
 * arrays; Mock Exam passes a real countdown and every published prompt. */
export function ExamRunner({
  attemptId,
  startedAt,
  mcqItems,
  mcqTimeLimitSec = null,
  writingItems,
  speakingItems,
  onSaveAnswer,
  onSaveSpeaking,
  onSubmitSpeaking,
  onFinalize,
}: {
  attemptId: string;
  startedAt: string;
  mcqItems: ExamMcqItem[];
  mcqTimeLimitSec?: number | null;
  writingItems: ExamWritingItem[];
  speakingItems: ExamSpeakingItem[];
  onSaveAnswer: (itemId: string, selectedOption: string) => Promise<void>;
  /** Uploads a non-final Speaking item's recording without finalizing the
   * exam (there's more to do — either more Speaking items, or this just
   * isn't the last phase). Only ever called when speakingItems.length > 1,
   * which today only happens for Mock Exam — Diagnostic's single Speaking
   * item always takes the onSubmitSpeaking path below. */
  onSaveSpeaking: (itemId: string, formData: FormData) => Promise<void>;
  /** Uploads the FINAL Speaking item's recording and finalizes the whole
   * exam attempt (score computation + submittedAt + redirect to results). */
  onSubmitSpeaking: (itemId: string, formData: FormData) => Promise<void>;
  onFinalize: (attemptId: string) => Promise<void>;
}) {
  const phases: Phase[] = [
    ...(mcqItems.length ? (["mcq"] as const) : []),
    ...(writingItems.length ? (["writing"] as const) : []),
    ...(speakingItems.length ? (["speaking"] as const) : []),
  ];
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [mcqIndex, setMcqIndex] = useState(0);
  const [writingIndex, setWritingIndex] = useState(0);
  const [speakingIndex, setSpeakingIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries(mcqItems.map((i) => [i.itemId, i.selectedOption]))
  );
  // Each Writing item's countdown must start when the student actually
  // reaches THAT item, not when the whole exam began — otherwise time
  // spent on earlier sections (or earlier Writing items) would eat into
  // its clock. Captured lazily: either now (if Writing is the very first
  // phase) or whenever the runner lands on a new writing item.
  const [writingItemStartedAt, setWritingItemStartedAt] = useState<string>(() =>
    phases[0] === "writing" ? new Date().toISOString() : ""
  );
  const [isPending, startTransition] = useTransition();
  const elapsed = useElapsedTime();

  function advanceOrFinalize() {
    if (phaseIndex + 1 < phases.length) {
      const nextPhase = phases[phaseIndex + 1];
      if (nextPhase === "writing") setWritingItemStartedAt(new Date().toISOString());
      setPhaseIndex((p) => p + 1);
    } else {
      startTransition(async () => {
        await onFinalize(attemptId);
      });
    }
  }

  const phase = phases[phaseIndex];

  if (phase === "mcq") {
    const current = mcqItems[mcqIndex];
    const options: QuestionOption[] = asOptions(current.options);
    const answeredCount = Object.values(answers).filter(Boolean).length;
    const isLastMcq = mcqIndex === mcqItems.length - 1;

    function select(optionKey: string) {
      setAnswers((prev) => ({ ...prev, [current.itemId]: optionKey }));
      startTransition(async () => {
        await onSaveAnswer(current.itemId, optionKey);
      });
    }

    return (
      <McqPhase
        current={current}
        options={options}
        answers={answers}
        answeredCount={answeredCount}
        totalCount={mcqItems.length}
        mcqIndex={mcqIndex}
        isLastMcq={isLastMcq}
        isPending={isPending}
        elapsed={elapsed}
        mcqTimeLimitSec={mcqTimeLimitSec}
        startedAt={startedAt}
        hasNextPhase={phaseIndex + 1 < phases.length}
        onSelect={select}
        onPrevious={() => setMcqIndex((i) => Math.max(0, i - 1))}
        onNext={() => setMcqIndex((i) => Math.min(mcqItems.length - 1, i + 1))}
        onAdvanceOrFinalize={advanceOrFinalize}
      />
    );
  }

  if (phase === "writing") {
    const current = writingItems[writingIndex];
    const isLastWriting = writingIndex === writingItems.length - 1;
    return (
      <WritingEditor
        key={current.itemId}
        attemptId={attemptId}
        itemId={current.itemId}
        prompt={current.prompt}
        startedAt={writingItemStartedAt}
        timeSec={current.timeSec}
        minWords={current.minWords}
        initialText={current.initialText}
        onSubmit={() => {
          if (!isLastWriting) {
            setWritingItemStartedAt(new Date().toISOString());
            setWritingIndex((i) => i + 1);
          } else {
            advanceOrFinalize();
          }
        }}
      />
    );
  }

  if (phase === "speaking") {
    const current = speakingItems[speakingIndex];
    const isLastSpeaking = speakingIndex === speakingItems.length - 1;
    return (
      <SpeakingRecorder
        key={current.itemId}
        itemId={current.itemId}
        prompt={current.prompt}
        prepTimeSec={current.prepTimeSec}
        recordTimeSec={current.recordTimeSec}
        onSubmit={
          isLastSpeaking
            ? onSubmitSpeaking
            : async (itemId, formData) => {
                await onSaveSpeaking(itemId, formData);
                setSpeakingIndex((i) => i + 1);
              }
        }
      />
    );
  }

  return null;
}

function McqPhase({
  current,
  options,
  answers,
  answeredCount,
  totalCount,
  mcqIndex,
  isLastMcq,
  isPending,
  elapsed,
  mcqTimeLimitSec,
  startedAt,
  hasNextPhase,
  onSelect,
  onPrevious,
  onNext,
  onAdvanceOrFinalize,
}: {
  current: ExamMcqItem;
  options: QuestionOption[];
  answers: Record<string, string | null>;
  answeredCount: number;
  totalCount: number;
  mcqIndex: number;
  isLastMcq: boolean;
  isPending: boolean;
  elapsed: string;
  mcqTimeLimitSec: number | null;
  startedAt: string;
  hasNextPhase: boolean;
  onSelect: (optionKey: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onAdvanceOrFinalize: () => void;
}) {
  // Hooks must run unconditionally, so the countdown is always computed
  // (deadline pinned far in the future when there's no time limit) and
  // simply not displayed when mcqTimeLimitSec is null.
  const deadline = mcqTimeLimitSec != null ? new Date(startedAt).getTime() + mcqTimeLimitSec * 1000 : Infinity;
  const countdown = useCountdown(deadline, () => {
    if (mcqTimeLimitSec != null) onAdvanceOrFinalize();
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          Question {mcqIndex + 1} of {totalCount}
        </span>
        <span>
          {answeredCount} / {totalCount} answered ·{" "}
          {mcqTimeLimitSec != null ? (
            <span className={countdown.startsWith("00:") ? "font-semibold text-danger" : ""}>{countdown}</span>
          ) : (
            elapsed
          )}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-raised p-6">
        {current.passage ? (
          <div className="prose-passage text-sm leading-7 text-text-secondary">{current.passage}</div>
        ) : current.audioUrl ? (
          <AudioPlayer key={current.itemId} src={current.audioUrl} />
        ) : null}
      </div>

      <h2 className="mt-6 text-lg font-medium text-text-primary">{current.prompt}</h2>

      <div className="mt-4 space-y-2" role="list">
        {options.map((opt) => (
          <AnswerOption
            key={opt.key}
            optionKey={opt.key}
            state={answers[current.itemId] === opt.key ? "selected" : "default"}
            onClick={() => onSelect(opt.key)}
            disabled={isPending}
          >
            {opt.text}
          </AnswerOption>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          disabled={mcqIndex === 0}
          onClick={onPrevious}
          className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
        >
          Previous
        </button>
        {isLastMcq ? (
          <button
            type="button"
            disabled={isPending}
            onClick={onAdvanceOrFinalize}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            {hasNextPhase ? "Continue" : "Finish"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
