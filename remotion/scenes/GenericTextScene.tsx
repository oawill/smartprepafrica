import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { theme } from "../theme";
import { fontFamily } from "../font";
import type { VideoSceneInput } from "../types";

/** Fallback for every scene type this first slice doesn't have a bespoke
 * component for. Renders real content (title + on-screen text) on the
 * brand background — deliberately plain rather than wrong or blank. */
export function GenericTextScene({ scene }: { scene: VideoSceneInput }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.surface, justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ opacity, textAlign: "center", maxWidth: "80%" }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: theme.textPrimary, fontFamily }}>{scene.title}</div>
        {scene.onScreenText && (
          <div style={{ marginTop: 32, fontSize: 36, color: theme.textSecondary, fontFamily, lineHeight: 1.5 }}>
            {scene.onScreenText}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, height: 8, backgroundColor: theme.brand }} />
    </AbsoluteFill>
  );
}
