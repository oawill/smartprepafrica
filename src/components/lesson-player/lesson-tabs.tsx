"use client";

import { useRef, useState } from "react";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { LESSON_QUICK_ACTIONS } from "@/components/ai-coach/types";
import { MessageContent } from "@/components/ai-coach/message-content";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/lesson-player/video-player";
import { ChapterList } from "@/components/lesson-player/chapter-list";
import { TranscriptView } from "@/components/lesson-player/transcript-view";
import { useProgressSync } from "@/components/lesson-player/use-progress-sync";
import { answerCheckpoint } from "@/app/educom/lesson-player-actions";
import type { VideoSource } from "@/lib/video/types";
import type { PlayerChapter, PlayerCheckpoint } from "@/components/lesson-player/types";

type Tab = "video" | "notes" | "transcript" | "practice";

export function LessonTabs({
  lessonId,
  courseId,
  source,
  chapters,
  checkpoints,
  initialPositionSeconds,
  notesMarkdown,
  transcriptFull,
  learningObjectives,
  onVideoEnded,
  practicePanel,
}: {
  lessonId: string;
  courseId: string;
  source: VideoSource | null;
  chapters: PlayerChapter[];
  checkpoints: PlayerCheckpoint[];
  initialPositionSeconds: number | null;
  notesMarkdown: string | null;
  transcriptFull: string | null;
  learningObjectives: string[];
  onVideoEnded?: () => void;
  practicePanel: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("video");
  const [currentSeconds, setCurrentSeconds] = useState(initialPositionSeconds ?? 0);
  const { onProgress } = useProgressSync(lessonId);
  const playerRef = useRef<VideoPlayerHandle>(null);

  const currentChapter = chapters.find((c, i) => {
    const end = c.endSeconds ?? chapters[i + 1]?.startSeconds ?? Infinity;
    return currentSeconds >= c.startSeconds && currentSeconds < end;
  });

  function handleProgress(seconds: number, duration: number) {
    setCurrentSeconds(seconds);
    onProgress(seconds, duration);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "video", label: "Video" },
    { key: "notes", label: "Notes" },
    { key: "transcript", label: "Transcript" },
    { key: "practice", label: "Practice" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-slate-800 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium sm:px-4 sm:text-sm ${
                tab === t.key ? "bg-orange-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <AiCoachPanel
          context={{ courseId, lessonId, chapterId: currentChapter?.id ?? null }}
          defaultMode="EXPLAIN"
          triggerLabel="Ask SmartPrep AI"
          quickActions={LESSON_QUICK_ACTIONS}
          suggestedPrompts={[
            "I don't understand this part.",
            "Explain it more simply.",
            "Give me another example.",
            "Quiz me on what I just watched.",
          ]}
        />
      </div>

      <div className="mt-4">
        {tab === "video" && (
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              {source ? (
                <VideoPlayer
                  playerRef={playerRef}
                  source={source}
                  chapters={chapters}
                  checkpoints={checkpoints}
                  initialPositionSeconds={initialPositionSeconds}
                  onAnswerCheckpoint={(checkpointId, selectedOption) =>
                    answerCheckpoint(lessonId, checkpointId, selectedOption)
                  }
                  onProgress={handleProgress}
                  onEnded={() => onVideoEnded?.()}
                />
              ) : (
                <p className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                  No video is available for this lesson yet.
                </p>
              )}

              {learningObjectives.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Students will learn
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {learningObjectives.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {chapters.length > 0 && (
              <aside className="shrink-0 lg:w-72">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chapters</p>
                <div className="mt-2">
                  <ChapterList
                    chapters={chapters}
                    currentSeconds={currentSeconds}
                    onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
                  />
                </div>
              </aside>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            {notesMarkdown ? (
              <MessageContent content={notesMarkdown} />
            ) : (
              <p className="text-sm text-slate-500">No notes have been added for this lesson yet.</p>
            )}
          </div>
        )}

        {tab === "transcript" && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <TranscriptView chapters={chapters} transcriptFull={transcriptFull} currentSeconds={currentSeconds} />
          </div>
        )}

        {tab === "practice" && <div>{practicePanel}</div>}
      </div>
    </div>
  );
}
