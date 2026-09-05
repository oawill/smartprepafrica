import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { theme } from "../theme";
import { fontFamily } from "../font";
import type { VideoSceneInput } from "../types";

/** Used for CONCEPT and DEFINITION scenes: a title band + body text,
 * matching the "concept explainer" framing already used elsewhere in
 * VideoType. */
export function ConceptScene({ scene }: { scene: VideoSceneInput }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.surface, padding: 100, justifyContent: "center" }}>
      <div style={{ opacity }}>
        <div
          style={{
            display: "inline-block",
            backgroundColor: theme.brand,
            color: theme.brandForeground,
            fontFamily,
            fontWeight: 700,
            fontSize: 40,
            padding: "12px 28px",
            borderRadius: 12,
            marginBottom: 40,
          }}
        >
          {scene.title}
        </div>
        {scene.onScreenText && (
          <div style={{ fontSize: 42, color: theme.textPrimary, fontFamily, lineHeight: 1.5, maxWidth: "90%" }}>
            {scene.onScreenText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
