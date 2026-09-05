import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme, TAGLINE } from "../theme";
import { fontFamily } from "../font";

export function BrandIntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.surface, justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
        <Img src={staticFile("logo-full.png")} style={{ width: 480 }} />
        <div style={{ marginTop: 24, fontSize: 32, color: theme.textSecondary, fontFamily }}>{TAGLINE}</div>
      </div>
    </AbsoluteFill>
  );
}
