// Mirrors the subset of Prisma's VideoScene/VideoProject fields this
// composition actually consumes — kept as plain types here (not imported
// from @prisma/client) since this bundle is built independently of the
// Next app by Remotion's own bundler and must not depend on Prisma's
// generated client or any server-only code.
export type VideoSceneInput = {
  id: string;
  order: number;
  sceneType: string;
  title: string;
  estimatedDurationSec: number;
  narration: string | null;
  onScreenText: string | null;
  equation: string | null;
  diagramDescription: string | null;
  voiceAudioUrl: string | null;
  voiceDurationSec: number | null;
};

export type VideoLessonProps = {
  project: {
    title: string;
    subjectName: string;
    topic: string;
    aspectRatio: "LANDSCAPE_16_9" | "VERTICAL_9_16" | "SQUARE_1_1";
  };
  scenes: VideoSceneInput[];
};
