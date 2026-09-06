"use client";

import { useRef, useState, useTransition } from "react";
import { submitSpeakingRecording } from "@/app/international-exams/toefl/speaking/actions";

type Phase = "prompt" | "preparing" | "recording" | "uploading" | "mic-error";

export function SpeakingRecorder({
  itemId,
  prompt,
  prepTimeSec,
  recordTimeSec,
}: {
  itemId: string;
  prompt: string;
  prepTimeSec: number;
  recordTimeSec: number;
}) {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [remaining, setRemaining] = useState(prepTimeSec);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartedAtRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTick() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function uploadRecording() {
    clearTick();
    stopStream();
    setPhase("uploading");

    const durationSec = (Date.now() - recordStartedAtRef.current) / 1000;
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });

    const formData = new FormData();
    formData.set("audio", blob, "recording.webm");
    formData.set("durationSec", String(Math.round(durationSec)));

    startTransition(async () => {
      await submitSpeakingRecording(itemId, formData);
    });
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMessage("This browser doesn't support audio recording. Please try a recent version of Chrome, Safari, or Firefox.");
      setPhase("mic-error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMessage("Microphone access was denied. Please allow microphone access in your browser and try again.");
      setPhase("mic-error");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = uploadRecording;
    mediaRecorderRef.current = recorder;

    recorder.start();
    recordStartedAtRef.current = Date.now();
    setPhase("recording");
    setRemaining(recordTimeSec);

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTick();
          recorder.stop();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  function beginPreparation() {
    setErrorMessage(null);
    setPhase("preparing");
    setRemaining(prepTimeSec);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTick();
          startRecording();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  function stopEarly() {
    mediaRecorderRef.current?.stop();
  }

  function retry() {
    setErrorMessage(null);
    setPhase("prompt");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="rounded-xl border border-border bg-surface-raised p-6">
        <p className="text-sm text-text-primary">{prompt}</p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        {phase === "prompt" && (
          <>
            <p className="text-sm text-text-secondary">
              You&apos;ll have {prepTimeSec} seconds to prepare, then {recordTimeSec} seconds to record your response.
            </p>
            <button
              type="button"
              onClick={beginPreparation}
              className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Start
            </button>
          </>
        )}

        {phase === "preparing" && (
          <>
            <p className="text-sm text-text-muted">Preparation time</p>
            <p className="text-4xl font-semibold text-text-primary">{remaining}</p>
          </>
        )}

        {phase === "recording" && (
          <>
            <p className="flex items-center gap-2 text-sm text-danger">
              <span className="h-2 w-2 animate-pulse rounded-full bg-danger" aria-hidden="true" />
              Recording
            </p>
            <p className="text-4xl font-semibold text-text-primary">{remaining}</p>
            <button
              type="button"
              onClick={stopEarly}
              className="rounded-lg border border-border-strong px-5 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Stop early
            </button>
          </>
        )}

        {phase === "uploading" && <p className="text-sm text-text-secondary">Uploading your recording…</p>}

        {phase === "mic-error" && (
          <>
            <p className="max-w-sm text-sm text-danger">{errorMessage}</p>
            <button
              type="button"
              onClick={retry}
              disabled={isPending}
              className="rounded-lg border border-border-strong px-5 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
