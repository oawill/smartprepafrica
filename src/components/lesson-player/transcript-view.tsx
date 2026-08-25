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
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{transcriptFull}</p>
    ) : (
      <p className="text-sm text-slate-500">No transcript available for this lesson yet.</p>
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
            className={`rounded-lg p-3 ${isActive ? "bg-orange-500/10 ring-1 ring-orange-500/30" : ""}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{chapter.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-300">{chapter.transcriptSegment}</p>
          </div>
        );
      })}
    </div>
  );
}
