"use client";

import { useState } from "react";
import type { PlayerCheckpoint } from "@/components/lesson-player/types";
import type { CheckpointAnswerResult } from "@/app/educom/lesson-player-actions";

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
    <div className="absolute inset-0 z-10 flex flex-col justify-center bg-slate-950/95 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">Quick Check</p>
      <h3 className="mt-2 text-lg font-medium text-slate-100">{checkpoint.prompt}</h3>

      <div className="mt-4 space-y-2">
        {checkpoint.options.map((option) => {
          const isSelected = selected === option.key;
          const isCorrectOption = revealedCorrectAnswer && result && option.key === result.correctOption;
          const showWrong = result && isSelected && !result.isCorrect;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => submit(option.key)}
              disabled={submitting || locked}
              className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm ${
                isCorrectOption
                  ? "border-green-600 bg-green-500/10 text-green-200"
                  : showWrong
                    ? "border-red-700 bg-red-500/10 text-red-200"
                    : isSelected
                      ? "border-orange-500 bg-orange-500/10 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              }`}
            >
              <span className="font-semibold">{option.key}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      {result && (
        <div className="mt-4">
          <p className={`text-sm font-medium ${result.isCorrect ? "text-green-400" : "text-amber-400"}`}>
            {result.isCorrect ? "Correct — well done." : "Not quite."}
          </p>
          {result.explanation && <p className="mt-1 text-sm text-slate-300">{result.explanation}</p>}
          <div className="mt-4 flex gap-2">
            {canRetry && (
              <button
                type="button"
                onClick={tryAgain}
                className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-300 hover:border-slate-500"
              >
                Try again
              </button>
            )}
            {locked && (
              <button
                type="button"
                onClick={onContinue}
                className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
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
