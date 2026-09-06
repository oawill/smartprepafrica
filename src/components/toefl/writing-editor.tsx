"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { countWords } from "@/lib/toefl/text";
import { saveWritingDraftAction, submitWritingAttemptAction } from "@/app/international-exams/toefl/writing/actions";

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function WritingEditor({
  attemptId,
  itemId,
  prompt,
  startedAt,
  timeSec,
  minWords,
  initialText,
  onSubmit,
}: {
  attemptId: string;
  itemId: string;
  prompt: string;
  startedAt: string;
  timeSec: number;
  minWords: number;
  initialText: string;
  /** Defaults to the standalone Writing flow's own submit+redirect.
   * Diagnostic passes its own callback to advance to the next section
   * instead, since the draft is already autosaved and nothing here
   * should redirect away from the diagnostic session. */
  onSubmit?: () => void | Promise<void>;
}) {
  const deadline = new Date(startedAt).getTime() + timeSec * 1000;
  const [text, setText] = useState(initialText);
  const [remainingMs, setRemainingMs] = useState(() => deadline - Date.now());
  const [isPending, startTransition] = useTransition();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSubmitted = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = countWords(text);

  function submit() {
    startTransition(async () => {
      if (onSubmit) {
        await onSubmit();
      } else {
        await submitWritingAttemptAction(attemptId);
      }
    });
  }

  // Server-anchored countdown — recomputed from the real deadline every
  // tick, not decremented client-side, so a page refresh can't grant
  // extra time.
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = deadline - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        submit();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  // Debounced autosave — never loses a completed draft to a crash/refresh,
  // per the brief's failure-handling requirement.
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      startTransition(async () => {
        await saveWritingDraftAction(itemId, text);
        setLastSavedAt(new Date());
      });
    }, 2000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, itemId]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{wordCount} words (minimum {minWords})</span>
        <span className={remainingMs < 60_000 ? "font-semibold text-danger" : ""}>{formatCountdown(remainingMs)}</span>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-raised p-5">
        <p className="text-sm text-text-primary">{prompt}</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        placeholder="Start writing your response here..."
        className="mt-4 w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-brand"
      />

      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
        <span>{lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : "Not saved yet"}</span>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
