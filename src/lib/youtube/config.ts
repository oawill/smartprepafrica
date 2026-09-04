/** A worker-secret-style gate, same role ANTHROPIC_API_KEY/OPENAI_API_KEY/
 * RENDER_WORKER_SECRET play in earlier VLS phases: its presence is the "can
 * the app even attempt OAuth" signal. A connected channel (a YouTubeConnection
 * row existing) is a separate, later gate — see settings/page.tsx. */
export function isYouTubeConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET && !!process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY;
}

export function youtubeRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";
  return `${base}/api/youtube/oauth/callback`;
}
