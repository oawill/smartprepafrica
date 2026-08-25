"use client";

import type { PlayerChapter } from "@/components/lesson-player/types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ChapterList({
  chapters,
  currentSeconds,
  onSeek,
}: {
  chapters: PlayerChapter[];
  currentSeconds: number;
  onSeek: (seconds: number) => void;
}) {
  if (chapters.length === 0) return null;

  return (
    <div className="space-y-1">
      {chapters.map((chapter, i) => {
        const end = chapter.endSeconds ?? chapters[i + 1]?.startSeconds ?? Infinity;
        const isActive = currentSeconds >= chapter.startSeconds && currentSeconds < end;
        return (
          <button
            key={chapter.id}
            type="button"
            onClick={() => onSeek(chapter.startSeconds)}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
              isActive ? "bg-brand/10 text-brand-text" : "text-text-secondary hover:bg-surface-sunken"
            }`}
          >
            <span>{chapter.title}</span>
            <span className="shrink-0 font-mono text-xs text-text-muted">{formatTime(chapter.startSeconds)}</span>
          </button>
        );
      })}
    </div>
  );
}
