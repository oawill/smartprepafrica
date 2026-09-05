// Brand tokens for the rendered video, copied once from the app's
// light-mode CSS custom properties (src/app/globals.css). Video output
// is a fixed artifact — there's no light/dark toggle to sync with, so
// this is a deliberate one-time snapshot, not a shared source of truth.
export const theme = {
  brand: "#f97316",
  brandHover: "#ea580c",
  brandForeground: "#10131a",
  brandText: "#c2410c",
  success: "#15803d",
  danger: "#b91c1c",
  textPrimary: "#10131a",
  textSecondary: "#454b57",
  textMuted: "#5b6270",
  surface: "#ffffff",
  surfaceSunken: "#eef0f3",
  border: "#e2e5ea",
} as const;

export const TAGLINE = "Learn • Practice • Succeed";
