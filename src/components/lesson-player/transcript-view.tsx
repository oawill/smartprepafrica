"use client";

import { useEffect, useRef } from "react";
import type { PlayerChapter } from "@/components/lesson-player/types";

/** Renders chapter-by-chapter transcript, or the whole-lesson fallback when
 * no chapters are authored. Usable without the video ever playing (or even
 * loading), per the low-bandwidth requirement — this is plain server-fetched
 * text, not derived from the video element. */
export function TranscriptView({
  chapters,
  transcriptFull,
  currentSeconds,
}: {
  chapters: PlayerChapter[];
  transcriptFull: string | null;
  currentSeconds: number;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  const chaptersWithTranscript = chapters.filter((c) => c.transcriptSegment);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentSeconds]);

  if (chaptersWithTranscript.length === 0) {
    return transcriptFull ? (
      <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">{transcriptFull}</p>
    ) : (
      <p className="text-sm text-text-muted">No transcript available for this lesson yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {chapters.map((chapter, i) => {
        if (!chapter.transcriptSegment) return null;
        const end = chapter.endSeconds ?? chapters[i + 1]?.startSeconds ?? Infinity;
        const isActive = currentSeconds >= chapter.startSeconds && currentSeconds < end;
        return (
          <div
            key={chapter.id}
            ref={isActive ? activeRef : undefined}
            className={`rounded-lg p-3 ${isActive ? "bg-brand/10 ring-1 ring-brand/30" : ""}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{chapter.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-text-secondary">{chapter.transcriptSegment}</p>
          </div>
        );
      })}
    </div>
  );
}
