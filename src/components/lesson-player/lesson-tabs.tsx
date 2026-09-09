"use client";

import { useRef, useState } from "react";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { LESSON_QUICK_ACTIONS } from "@/components/ai-coach/types";
import { MessageContent } from "@/components/ai-coach/message-content";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/lesson-player/video-player";
import { ChapterList } from "@/components/lesson-player/chapter-list";
import { TranscriptView } from "@/components/lesson-player/transcript-view";
import { useProgressSync } from "@/components/lesson-player/use-progress-sync";
import { answerCheckpoint } from "@/app/learn/lesson-player-actions";
import type { VideoSource } from "@/lib/video/types";
import type { PlayerChapter, PlayerCheckpoint } from "@/components/lesson-player/types";

type Tab = "video" | "notes" | "transcript" | "practice" | "discussion";

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
  discussionPanel,
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
  discussionPanel: React.ReactNode;
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
    { key: "discussion", label: "Discussion" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap sm:px-4 sm:text-sm ${
                tab === t.key ? "bg-brand text-brand-foreground" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <AiCoachPanel
            context={{ courseId, lessonId, chapterId: currentChapter?.id ?? null }}
            defaultMode="EXPLAIN"
            triggerLabel="Ask SmartPrep AI"
            triggerClassName="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            quickActions={LESSON_QUICK_ACTIONS}
            suggestedPrompts={[
              "I don't understand this part.",
              "Explain it more simply.",
              "Give me another example.",
              "Quiz me on what I just watched.",
            ]}
          />
          <button
            type="button"
            onClick={() => setTab("discussion")}
            className="whitespace-nowrap text-xs text-text-secondary hover:text-brand-text"
          >
            Still stuck? Ask a tutor
          </button>
        </div>
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
                <p className="rounded-lg border border-border bg-surface-raised p-6 text-sm text-text-secondary">
                  No video is available for this lesson yet.
                </p>
              )}

              {learningObjectives.length > 0 && (
                <div className="mt-4 rounded-lg border border-border bg-surface-raised p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Students will learn
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                    {learningObjectives.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {chapters.length > 0 && (
              <aside className="shrink-0 lg:w-72">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Chapters</p>
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
          <div className="rounded-lg border border-border bg-surface-raised p-5">
            {notesMarkdown ? (
              <MessageContent content={notesMarkdown} />
            ) : (
              <p className="text-sm text-text-muted">No notes have been added for this lesson yet.</p>
            )}
          </div>
        )}

        {tab === "transcript" && (
          <div className="rounded-lg border border-border bg-surface-raised p-5">
            <TranscriptView chapters={chapters} transcriptFull={transcriptFull} currentSeconds={currentSeconds} />
          </div>
        )}

        {tab === "practice" && <div>{practicePanel}</div>}

        {tab === "discussion" && <div>{discussionPanel}</div>}
      </div>
    </div>
  );
}
