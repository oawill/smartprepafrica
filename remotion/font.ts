import { loadFont } from "@remotion/google-fonts/Geist";

// Loaded once at module scope; Remotion's renderer automatically waits
// for this to finish before rendering frames (loadFont() registers its
// own delayRender() internally). Geist matches the app's own font
// (src/app/layout.tsx uses next/font/google Geist) and is MIT-licensed.
export const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] });
