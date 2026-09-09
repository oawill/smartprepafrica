"use client";

import { useState } from "react";
import type { PlayerCheckpoint } from "@/components/lesson-player/types";
import type { CheckpointAnswerResult } from "@/app/learn/lesson-player-actions";
import { startTopicDrill } from "@/app/practice/drills/actions";
import { AnswerOption, type AnswerOptionState } from "@/components/exam/answer-option";
import { CheckIcon, XIcon } from "@/components/ui/icons";

const MAX_ATTEMPTS = 2;

export function CheckpointOverlay({
  checkpoint,
  onAnswer,
  onContinue,
}: {
  checkpoint: PlayerCheckpoint;
  onAnswer: (selectedOption: string) => Promise<CheckpointAnswerResult>;
  onContinue: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<CheckpointAnswerResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const revealedCorrectAnswer = result?.isCorrect || attempts >= MAX_ATTEMPTS;
  const canRetry = result && !result.isCorrect && !revealedCorrectAnswer;

  async function submit(key: string) {
    if (submitting || (result && !canRetry)) return;
    setSelected(key);
    setSubmitting(true);
    try {
      const res = await onAnswer(key);
      setAttempts((n) => n + 1);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  function tryAgain() {
    setSelected(null);
    setResult(null);
  }

  const locked = !!result && !canRetry;

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-center overflow-y-auto bg-surface/95 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">Quick Check</p>
      <h3 className="mt-2 text-question font-medium text-text-primary">{checkpoint.prompt}</h3>

      <div className="mt-4 space-y-2" role="list">
        {checkpoint.options.map((option) => {
          const isSelected = selected === option.key;
          const isCorrectOption = revealedCorrectAnswer && result && option.key === result.correctOption;
          const showWrong = result && isSelected && !result.isCorrect;
          const state: AnswerOptionState = isCorrectOption
            ? "correct"
            : showWrong
              ? "incorrect"
              : isSelected
                ? "selected"
                : "default";
          return (
            <AnswerOption
              key={option.key}
              optionKey={option.key}
              state={state}
              disabled={submitting || locked}
              onClick={() => submit(option.key)}
            >
              {option.text}
            </AnswerOption>
          );
        })}
      </div>

      {result && (
        <div className="mt-4">
          <p
            className={`flex items-center gap-1.5 text-sm font-medium ${
              result.isCorrect ? "text-success" : "text-warning"
            }`}
          >
            {result.isCorrect ? <CheckIcon className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
            {result.isCorrect ? "Correct — well done." : "Not quite."}
          </p>
          {result.explanation && <p className="mt-1 text-sm text-text-secondary">{result.explanation}</p>}
          {result.prepDrill && (
            <div className="mt-4 rounded-lg border border-brand/40 bg-brand/10 p-4">
              <p className="text-sm font-medium text-brand-text">
                You&apos;re still working on {result.prepDrill.topic}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Practice it in a {result.prepDrill.exam} drill from the real question bank.
              </p>
              <form action={startTopicDrill} className="mt-3">
                <input type="hidden" name="exam" value={result.prepDrill.exam} />
                <input type="hidden" name="subjectId" value={result.prepDrill.subjectId} />
                <input type="hidden" name="topic" value={result.prepDrill.topic} />
                <button
                  type="submit"
                  className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  Practice in a {result.prepDrill.exam} drill
                </button>
              </form>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            {canRetry && (
              <button
                type="button"
                onClick={tryAgain}
                className="rounded-full border border-border-strong px-5 py-2 text-sm text-text-secondary hover:border-text-muted"
              >
                Try again
              </button>
            )}
            {locked && (
              <button
                type="button"
                onClick={onContinue}
                className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
