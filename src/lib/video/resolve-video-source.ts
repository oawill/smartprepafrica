import type { VideoSource } from "@/lib/video/types";

/** The single seam between "how a lesson's video is stored" and "how the
 * player consumes it". Every lesson-video field is a plain pasted URL today
 * (no upload/streaming provider exists in this app) - callers should always
 * go through this function rather than reading `lesson.videoUrl` directly,
 * so swapping in a real provider later (signed URLs, adaptive renditions)
 * only requires rewriting this one function, not the player. */
export function resolveVideoSource(lesson: {
  videoUrl: string | null;
  captionsUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}): VideoSource | null {
  if (!lesson.videoUrl) return null;
  return {
    playbackUrl: lesson.videoUrl,
    captionsUrl: lesson.captionsUrl,
    thumbnailUrl: lesson.thumbnailUrl,
    durationSeconds: lesson.durationSeconds,
    qualityOptions: null,
  };
}
