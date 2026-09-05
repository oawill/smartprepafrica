import { Composition } from "remotion";
import { VideoLesson } from "./VideoLesson";
import type { VideoLessonProps } from "./types";

const FPS = 30;

function dimensionsFor(aspectRatio: VideoLessonProps["project"]["aspectRatio"]) {
  switch (aspectRatio) {
    case "VERTICAL_9_16":
      return { width: 1080, height: 1920 };
    case "SQUARE_1_1":
      return { width: 1080, height: 1080 };
    case "LANDSCAPE_16_9":
    default:
      return { width: 1920, height: 1080 };
  }
}

const defaultProps: VideoLessonProps = {
  project: { title: "Untitled", subjectName: "Chemistry", topic: "Untitled Topic", aspectRatio: "LANDSCAPE_16_9" },
  scenes: [],
};

export function RemotionRoot() {
  return (
    <Composition
      id="VideoLesson"
      component={VideoLesson}
      durationInFrames={FPS * 10}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }) => {
        const totalSec = props.scenes.reduce((sum, s) => sum + (s.voiceDurationSec ?? s.estimatedDurationSec), 0);
        const { width, height } = dimensionsFor(props.project.aspectRatio);
        return {
          durationInFrames: Math.max(FPS, Math.round(totalSec * FPS)),
          fps: FPS,
          width,
          height,
        };
      }}
    />
  );
}
