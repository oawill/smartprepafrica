"use client";

import { useCallback, useEffect, useRef } from "react";
import { syncLessonProgress } from "@/app/learn/lesson-player-actions";

const SYNC_INTERVAL_MS = 15000;

/** Decouples cheap client-side sampling (every video timeupdate) from the
 * actual network write (periodic, not one write per event). Tolerant of a
 * dropped connection — a failed flush is silently swallowed and self-heals
 * on the next tick with the latest position; worst case is losing ~15s of
 * resume precision, an explicit accepted trade-off rather than an attempt
 * at an exact flush-on-unmount (not reliably achievable from a Server
 * Action call, unlike a real sendBeacon-backed endpoint). */
export function useProgressSync(lessonId: string) {
  const latestRef = useRef<{ position: number; percent: number } | null>(null);

  const flushNow = useCallback(() => {
    const latest = latestRef.current;
    if (!latest) return;
    syncLessonProgress(lessonId, Math.floor(latest.position), latest.percent).catch(() => {
      // Self-heals on the next periodic tick.
    });
  }, [lessonId]);

  useEffect(() => {
    const interval = setInterval(flushNow, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [flushNow]);

  const onProgress = useCallback((currentSeconds: number, durationSeconds: number) => {
    const percent = durationSeconds > 0 ? Math.min(100, (currentSeconds / durationSeconds) * 100) : 0;
    latestRef.current = { position: currentSeconds, percent };
  }, []);

  return { onProgress, flushNow };
}
