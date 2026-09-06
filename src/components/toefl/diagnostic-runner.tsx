"use client";

import { useEffect, useState, useTransition } from "react";
import { AnswerOption } from "@/components/exam/answer-option";
import { AudioPlayer } from "@/components/toefl/audio-player";
import { WritingEditor } from "@/components/toefl/writing-editor";
import { SpeakingRecorder } from "@/components/toefl/speaking-recorder";
import { asOptions, type QuestionOption } from "@/lib/practice-types";
import { saveDiagnosticAnswer, submitDiagnosticSpeakingRecording, finalizeDiagnosticAttempt } from "@/app/international-exams/toefl/diagnostic/actions";

export type DiagnosticMcqItem = {
  itemId: string;
  passage: string | null;
  audioUrl: string | null;
  prompt: string;
  options: unknown;
  selectedOption: string | null;
};

export type DiagnosticWritingItem = {
  itemId: string;
  prompt: string;
  initialText: string;
  timeSec: number;
  minWords: number;
};

export type DiagnosticSpeakingItem = {
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

export function DiagnosticRunner({
  attemptId,
  mcqItems,
  writingItem,
  speakingItem,
}: {
  attemptId: string;
  mcqItems: DiagnosticMcqItem[];
  writingItem: DiagnosticWritingItem | null;
  speakingItem: DiagnosticSpeakingItem | null;
}) {
  const phases: Phase[] = [
    ...(mcqItems.length ? (["mcq"] as const) : []),
    ...(writingItem ? (["writing"] as const) : []),
    ...(speakingItem ? (["speaking"] as const) : []),
  ];
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [mcqIndex, setMcqIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries(mcqItems.map((i) => [i.itemId, i.selectedOption]))
  );
  // The Writing section's timer must start when the student actually
  // reaches it, not when the whole diagnostic attempt began — otherwise
  // time spent on Reading/Listening would eat into the writing clock.
  // Captured lazily: either now (if Writing is the very first phase) or
  // whenever advanceOrFinalize transitions into it.
  const [writingStartedAt, setWritingStartedAt] = useState<string>(() =>
    phases[0] === "writing" ? new Date().toISOString() : ""
  );
  const [isPending, startTransition] = useTransition();
  const elapsed = useElapsedTime();

  function advanceOrFinalize() {
    if (phaseIndex + 1 < phases.length) {
      const nextPhase = phases[phaseIndex + 1];
      if (nextPhase === "writing") setWritingStartedAt(new Date().toISOString());
      setPhaseIndex((p) => p + 1);
    } else {
      startTransition(async () => {
        await finalizeDiagnosticAttempt(attemptId);
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
        await saveDiagnosticAnswer(current.itemId, optionKey);
      });
    }

    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Question {mcqIndex + 1} of {mcqItems.length}
          </span>
          <span>
            {answeredCount} / {mcqItems.length} answered · {elapsed}
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
            disabled={mcqIndex === 0}
            onClick={() => setMcqIndex((i) => Math.max(0, i - 1))}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
          >
            Previous
          </button>
          {isLastMcq ? (
            <button
              type="button"
              disabled={isPending}
              onClick={advanceOrFinalize}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              {phaseIndex + 1 < phases.length ? "Continue" : "Finish"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMcqIndex((i) => Math.min(mcqItems.length - 1, i + 1))}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Next
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "writing" && writingItem) {
    return (
      <WritingEditor
        attemptId={attemptId}
        itemId={writingItem.itemId}
        prompt={writingItem.prompt}
        startedAt={writingStartedAt}
        timeSec={writingItem.timeSec}
        minWords={writingItem.minWords}
        initialText={writingItem.initialText}
        onSubmit={advanceOrFinalize}
      />
    );
  }

  if (phase === "speaking" && speakingItem) {
    return (
      <SpeakingRecorder
        itemId={speakingItem.itemId}
        prompt={speakingItem.prompt}
        prepTimeSec={speakingItem.prepTimeSec}
        recordTimeSec={speakingItem.recordTimeSec}
        onSubmit={submitDiagnosticSpeakingRecording}
      />
    );
  }

  return null;
}
