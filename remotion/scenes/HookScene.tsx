import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { fontFamily } from "../font";
import type { VideoSceneInput } from "../types";

export function HookScene({ scene }: { scene: VideoSceneInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${theme.brand}, ${theme.brandHover})`,
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
      }}
    >
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
        <div style={{ fontSize: 76, fontWeight: 800, color: theme.brandForeground, fontFamily, lineHeight: 1.15 }}>
          {scene.title}
        </div>
        {scene.onScreenText && (
          <div style={{ marginTop: 28, fontSize: 34, color: theme.brandForeground, fontFamily, opacity: 0.85 }}>
            {scene.onScreenText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
