import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { isVideoAiConfigured, getVideoScriptModelId } from "@/lib/ai/video/provider";
import { isVoiceConfigured } from "@/lib/ai/voice/provider";
import { isBlobStorageConfigured } from "@/lib/storage/blob-storage";
import { isRemotionConfigured } from "@/lib/video/render-worker";
import { isYouTubeConfigured } from "@/lib/youtube/config";
import { prisma } from "@/lib/prisma";
import { createPronunciationOverride, deletePronunciationOverride, disconnectYouTubeChannel } from "@/app/dashboard/admin/video-studio/settings/actions";

function NotConfigured({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <Badge tone="neutral">Not configured</Badge>
    </div>
  );
}

export default async function VideoStudioSettingsPage({ searchParams }: { searchParams: Promise<{ youtube?: string }> }) {
  const session = await requireAdminPagePermission("video_studio.view");
  const { youtube: youtubeStatus } = await searchParams;
  const aiConfigured = isVideoAiConfigured();
  const voiceConfigured = isVoiceConfigured();
  const storageConfigured = isBlobStorageConfigured();
  const renderWorkerConfigured = isRemotionConfigured();
  const youtubeConfigured = isYouTubeConfigured();
  const canManage = hasPermission(session.user.adminRole, "video_studio.create");
  const overrides = await prisma.voicePronunciationOverride.findMany({ orderBy: { displayText: "asc" } });
  const youtubeConnection = youtubeConfigured ? await prisma.youTubeConnection.findFirst() : null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 font-semibold text-text-primary">Video Learning Studio — Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Integration and default-behavior settings. API credentials are never exposed to the browser — every value
        below is read from server-side environment configuration.
      </p>

      {youtubeStatus === "connected" && (
        <p className="mt-4 rounded-lg border border-success/40 bg-success-surface px-3 py-2 text-sm text-success">YouTube channel connected.</p>
      )}
      {youtubeStatus === "error" && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger-surface px-3 py-2 text-sm text-danger">
          Couldn&apos;t connect the YouTube channel. Check the server logs and try again.
        </p>
      )}

      <div className="mt-6 space-y-4">
        <Card title="AI (script & scene generation)">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Anthropic Claude ({getVideoScriptModelId()})</span>
            <Badge tone={aiConfigured ? "success" : "neutral"}>{aiConfigured ? "Configured" : "Not configured"}</Badge>
          </div>
          {!aiConfigured && (
            <p className="mt-2 text-xs text-text-muted">
              Set <code>ANTHROPIC_API_KEY</code> (and optionally <code>AI_VIDEO_MODEL</code>) to enable script generation.
            </p>
          )}
        </Card>

        <Card title="Voice generation">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">OpenAI TTS (tts-1)</span>
            <Badge tone={voiceConfigured ? "success" : "neutral"}>{voiceConfigured ? "Configured" : "Not configured"}</Badge>
          </div>
          {!voiceConfigured && (
            <p className="mt-2 text-xs text-text-muted">
              Set <code>OPENAI_API_KEY</code> to enable narration voice generation.
            </p>
          )}
        </Card>

        <Card title="Audio storage">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Vercel Blob</span>
            <Badge tone={storageConfigured ? "success" : "neutral"}>{storageConfigured ? "Configured" : "Not configured"}</Badge>
          </div>
          {!storageConfigured && (
            <p className="mt-2 text-xs text-text-muted">
              Enable a Blob store for this project in the Vercel dashboard — <code>BLOB_READ_WRITE_TOKEN</code> is set
              automatically once attached.
            </p>
          )}
        </Card>

        <Card title="Pronunciation overrides">
          <p className="text-xs text-text-muted">
            Applied automatically before every voice generation call — corrects scientific/technical terms TTS
            providers commonly mispronounce.
          </p>
          {overrides.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm">
              {overrides.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5">
                  <span className="text-text-primary">
                    {o.displayText} <span className="text-text-muted">→</span> {o.pronunciationText}
                    {o.phoneme && <span className="ml-1 text-xs text-text-muted">({o.phoneme})</span>}
                  </span>
                  {canManage && (
                    <form action={deletePronunciationOverride}>
                      <input type="hidden" name="id" value={o.id} />
                      <button type="submit" className="text-xs text-danger hover:underline">
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canManage && (
            <form action={createPronunciationOverride} className="mt-3 grid gap-2 sm:grid-cols-3">
              <Input name="displayText" placeholder="Term, e.g. WAEC" required />
              <Input name="pronunciationText" placeholder="Pronounce as, e.g. way-eck" required />
              <div className="flex gap-2">
                <Input name="phoneme" placeholder="IPA (optional)" className="flex-1" />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  Add
                </button>
              </div>
            </form>
          )}
        </Card>

        <Card title="Visual generation">
          <NotConfigured label="Diagram / image generation provider" />
          <p className="mt-2 text-xs text-text-muted">
            Equations already render via KaTeX (reusing the AI Coach&apos;s renderer). Diagram/illustration generation
            is a later phase.
          </p>
        </Card>

        <Card title="Video rendering">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Remotion Lambda</span>
            <Badge tone={renderWorkerConfigured ? "success" : "neutral"}>
              {renderWorkerConfigured ? "Configured" : "Not configured"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {renderWorkerConfigured
              ? "Rendering runs on your deployed Remotion Lambda function. Scene types without a bespoke design (see remotion/scenes/) fall back to a plain on-brand template rather than looking wrong."
              : "Set REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY, REMOTION_AWS_REGION, REMOTION_FUNCTION_NAME, REMOTION_SERVE_URL, and REMOTION_WEBHOOK_SECRET once you've deployed a Remotion Lambda function and site (see remotion.dev/docs/lambda/setup) — until then, Render stays disabled."}
          </p>
        </Card>

        <Card title="YouTube">
          {!youtubeConfigured ? (
            <>
              <NotConfigured label="YouTube app credentials" />
              <p className="mt-2 text-xs text-text-muted">
                Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and{" "}
                <code>YOUTUBE_TOKEN_ENCRYPTION_KEY</code> to enable connecting a channel.
              </p>
            </>
          ) : youtubeConnection ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {youtubeConnection.channelThumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={youtubeConnection.channelThumbnailUrl} alt="" className="h-8 w-8 rounded-full" />
                  )}
                  <span className="text-sm text-text-primary">{youtubeConnection.channelTitle}</span>
                </div>
                <Badge tone="success">Connected</Badge>
              </div>
              {canManage && (
                <form action={disconnectYouTubeChannel} className="mt-3">
                  <button type="submit" className="text-xs text-danger hover:underline">
                    Disconnect
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Channel connection</span>
                <Badge tone="neutral">Not connected</Badge>
              </div>
              {canManage && (
                <a
                  href="/api/youtube/oauth/connect"
                  className="mt-3 inline-block rounded-lg bg-brand px-3 py-2 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  Connect channel
                </a>
              )}
            </>
          )}
          <p className="mt-2 text-xs text-text-muted">Uploads always default to Private — never Public automatically.</p>
        </Card>

        <Card title="Branding">
          <p className="text-sm text-text-secondary">Reuses the platform&apos;s existing brand — no separate identity for video content.</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
            <span className="text-xs text-text-muted">Brand orange · SmartPrepAfrica logo · &quot;Learn • Practice • Succeed&quot; tagline</span>
          </div>
        </Card>

        <Card title="Default lesson settings">
          <p className="text-sm text-text-secondary">Default video type: Full Lesson · Default length: 8 minutes · Default aspect ratio: 16:9</p>
        </Card>

        <Card title="Curriculum">
          <p className="text-sm text-text-secondary">
            Uses the platform&apos;s existing Country / Exam / Subject / Topic structure — manage those under{" "}
            <span className="text-text-primary">Countries &amp; Exams</span> and{" "}
            <span className="text-text-primary">Subjects &amp; topics</span>.
          </p>
        </Card>
      </div>
    </div>
  );
}
