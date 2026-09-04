/** A render worker (Remotion Lambda, a dedicated container, wherever it
 * eventually runs) authenticates its progress callbacks with this shared
 * secret. Its mere presence is also the "is a worker actually connected"
 * signal for the admin UI — same role ANTHROPIC_API_KEY/OPENAI_API_KEY
 * play in earlier phases. Setting this with no worker actually polling
 * VideoRenderJob rows would just leave jobs stuck at QUEUED with no
 * explanation — only set it once a real worker exists. */
export function isRenderWorkerConfigured(): boolean {
  return !!process.env.RENDER_WORKER_SECRET;
}
