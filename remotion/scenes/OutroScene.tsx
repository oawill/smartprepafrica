import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { theme, TAGLINE } from "../theme";
import { fontFamily } from "../font";
import type { VideoSceneInput } from "../types";

export function OutroScene({ scene }: { scene: VideoSceneInput }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.surface, justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity, textAlign: "center" }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: theme.textPrimary, fontFamily, marginBottom: 32 }}>
          {scene.title}
        </div>
        <Img src={staticFile("logo-full.png")} style={{ width: 320 }} />
        <div style={{ marginTop: 20, fontSize: 26, color: theme.textSecondary, fontFamily }}>{TAGLINE}</div>
      </div>
    </AbsoluteFill>
  );
}
