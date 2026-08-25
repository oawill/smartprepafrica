"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { VideoSource } from "@/lib/video/types";
import type { PlayerChapter, PlayerCheckpoint } from "@/components/lesson-player/types";
import type { CheckpointAnswerResult } from "@/app/educom/lesson-player-actions";
import { CheckpointOverlay } from "@/components/lesson-player/checkpoint-overlay";

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type VideoPlayerHandle = {
  seekTo: (seconds: number) => void;
};

export function VideoPlayer({
  source,
  chapters,
  checkpoints,
  initialPositionSeconds,
  onAnswerCheckpoint,
  onProgress,
  onEnded,
  playerRef,
}: {
  source: VideoSource;
  chapters: PlayerChapter[];
  checkpoints: PlayerCheckpoint[];
  initialPositionSeconds: number | null;
  onAnswerCheckpoint: (checkpointId: string, selectedOption: string) => Promise<CheckpointAnswerResult>;
  onProgress: (currentSeconds: number, durationSeconds: number) => void;
  onEnded: () => void;
  playerRef?: Ref<VideoPlayerHandle>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggeredCheckpoints = useRef<Set<string>>(new Set());
  const resumedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(source.durationSeconds ?? 0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [activeCheckpoint, setActiveCheckpoint] = useState<PlayerCheckpoint | null>(null);

  const currentChapterIndex = chapters.findIndex((c, i) => {
    const end = c.endSeconds ?? chapters[i + 1]?.startSeconds ?? Infinity;
    return currentTime >= c.startSeconds && currentTime < end;
  });

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    if (initialPositionSeconds && !resumedRef.current) {
      resumedRef.current = true;
      video.currentTime = initialPositionSeconds;
    }
  }, [initialPositionSeconds]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    onProgress(video.currentTime, video.duration || 0);

    // Fires on every real timeupdate during playback (not just manual
    // seeks), so a checkpoint reliably stops the student when they reach
    // it. Seeking backward past a checkpoint clears its triggered flag so
    // it can fire again on a second pass through.
    for (const cp of checkpoints) {
      const alreadyTriggered = triggeredCheckpoints.current.has(cp.id);
      if (!alreadyTriggered && video.currentTime >= cp.atSeconds) {
        triggeredCheckpoints.current.add(cp.id);
        video.pause();
        setActiveCheckpoint(cp);
        break;
      }
    }
    for (const cp of checkpoints) {
      if (video.currentTime < cp.atSeconds - 1) {
        triggeredCheckpoints.current.delete(cp.id);
      }
    }
  }, [checkpoints, onProgress]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  const seekTo = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(0, Math.min(duration, seconds));
    },
    [duration]
  );

  useImperativeHandle(playerRef, () => ({ seekTo }), [seekTo]);

  function handleScrubberClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  }

  function changeSpeed(rate: number) {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }

  function changeVolume(v: number) {
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
  }

  function toggleCaptions() {
    const video = videoRef.current;
    setCaptionsOn((prev) => {
      const next = !prev;
      const track = video?.textTracks[0];
      if (track) track.mode = next ? "showing" : "hidden";
      return next;
    });
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  }

  async function handleAnswer(selectedOption: string) {
    if (!activeCheckpoint) throw new Error("No active checkpoint.");
    return onAnswerCheckpoint(activeCheckpoint.id, selectedOption);
  }

  function continueAfterCheckpoint() {
    setActiveCheckpoint(null);
    videoRef.current?.play();
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg border border-border bg-black">
      <div className="relative aspect-video">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- captions track is added below when captionsUrl is present */}
        <video
          ref={videoRef}
          src={source.playbackUrl}
          poster={source.thumbnailUrl ?? undefined}
          className="h-full w-full"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onEnded}
          onClick={togglePlay}
        >
          {source.captionsUrl && <track kind="captions" src={source.captionsUrl} default={captionsOn} />}
        </video>

        {activeCheckpoint && (
          <CheckpointOverlay
            checkpoint={activeCheckpoint}
            onAnswer={handleAnswer}
            onContinue={continueAfterCheckpoint}
          />
        )}
      </div>

      <div className="bg-surface-raised px-4 py-3">
        {/* Custom scrubber with chapter tick marks — a native range input
            can't easily overlay chapter markers, so this is a plain
            click-to-seek div with absolutely-positioned ticks. */}
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
          onClick={handleScrubberClick}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") seekTo(currentTime + 5);
            if (e.key === "ArrowLeft") seekTo(currentTime - 5);
          }}
          className="relative h-2 w-full cursor-pointer rounded-full bg-surface-sunken"
        >
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
          {chapters.map((c) => (
            <div
              key={c.id}
              className="absolute top-0 h-2 w-0.5 bg-surface-raised"
              style={{ left: duration ? `${(c.startSeconds / duration) * 100}%` : "0%" }}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="rounded-full bg-brand p-2 text-brand-foreground hover:bg-brand-hover"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <span className="font-mono text-xs text-text-secondary">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {currentChapterIndex >= 0 && (
            <span className="hidden truncate text-xs text-text-muted sm:inline">
              {chapters[currentChapterIndex].title}
            </span>
          )}

          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
              <VolumeIcon />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume"
                className="w-16 accent-brand"
              />
            </label>

            <select
              value={playbackRate}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              aria-label="Playback speed"
              className="rounded border border-border-strong bg-surface px-1.5 py-1 text-xs text-text-secondary"
            >
              {PLAYBACK_SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>

            {source.captionsUrl && (
              <button
                type="button"
                onClick={toggleCaptions}
                aria-pressed={captionsOn}
                className={`rounded border px-1.5 py-1 text-xs ${
                  captionsOn ? "border-brand text-brand-text" : "border-border-strong text-text-secondary"
                }`}
              >
                CC
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Fullscreen"
              className="rounded border border-border-strong p-1.5 text-text-secondary hover:border-text-muted"
            >
              <FullscreenIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 10v4h4l5 5V5L7 10H3z" />
    </svg>
  );
}
function FullscreenIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    </svg>
  );
}
