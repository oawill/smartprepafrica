import { AbsoluteFill, Audio, Series, useVideoConfig } from "remotion";
import { HookScene } from "./scenes/HookScene";
import { BrandIntroScene } from "./scenes/BrandIntroScene";
import { ConceptScene } from "./scenes/ConceptScene";
import { EquationScene } from "./scenes/EquationScene";
import { OutroScene } from "./scenes/OutroScene";
import { GenericTextScene } from "./scenes/GenericTextScene";
import type { VideoLessonProps, VideoSceneInput } from "./types";

// Scene types this first slice has a bespoke component for. Every other
// type (13 of the 19 defined in VideoSceneType) falls through to
// GenericTextScene — a real, correctly-branded render, just not bespoke.
function SceneComponent({ scene }: { scene: VideoSceneInput }) {
  switch (scene.sceneType) {
    case "HOOK":
      return <HookScene scene={scene} />;
    case "BRAND_INTRO":
      return <BrandIntroScene />;
    case "CONCEPT":
    case "DEFINITION":
      return <ConceptScene scene={scene} />;
    case "EQUATION":
      return <EquationScene scene={scene} />;
    case "OUTRO":
      return <OutroScene scene={scene} />;
    default:
      return <GenericTextScene scene={scene} />;
  }
}

export function VideoLesson({ scenes }: VideoLessonProps) {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence key={scene.id} durationInFrames={Math.max(1, Math.round((scene.voiceDurationSec ?? scene.estimatedDurationSec) * fps))}>
            <SceneComponent scene={scene} />
            {scene.voiceAudioUrl && <Audio src={scene.voiceAudioUrl} />}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
}
