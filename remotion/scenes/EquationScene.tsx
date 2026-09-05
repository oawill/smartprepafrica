import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import katex from "katex";
import "katex/dist/katex.min.css";
import { theme } from "../theme";
import { fontFamily } from "../font";
import type { VideoSceneInput } from "../types";

/** For EQUATION scenes. Uses katex.renderToString() directly rather than
 * the app's existing EquationDisplay/MessageContent component — that one
 * goes through react-markdown + rehype-katex, which assumes an async,
 * client-side render pass. Remotion renders each frame independently and
 * deterministically server-side, so equation markup needs to be
 * available synchronously; katex.renderToString() is KaTeX's own
 * server-safe API for exactly this. */
export function EquationScene({ scene }: { scene: VideoSceneInput }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const html = scene.equation
    ? katex.renderToString(scene.equation, { throwOnError: false, displayMode: true })
    : "";

  return (
    <AbsoluteFill style={{ backgroundColor: theme.surface, justifyContent: "center", alignItems: "center", padding: 100 }}>
      <div style={{ opacity, textAlign: "center" }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: theme.textPrimary, fontFamily, marginBottom: 40 }}>
          {scene.title}
        </div>
        {html && <div style={{ fontSize: 44, color: theme.textPrimary }} dangerouslySetInnerHTML={{ __html: html }} />}
      </div>
    </AbsoluteFill>
  );
}
