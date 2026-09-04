import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { isVideoAiConfigured, getVideoScriptModelId } from "@/lib/ai/video/provider";

function NotConfigured({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <Badge tone="neutral">Not configured</Badge>
    </div>
  );
}

export default async function VideoStudioSettingsPage() {
  await requireAdminPagePermission("video_studio.view");
  const aiConfigured = isVideoAiConfigured();

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 font-semibold text-text-primary">Video Learning Studio — Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Integration and default-behavior settings. API credentials are never exposed to the browser — every value
        below is read from server-side environment configuration.
      </p>

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
          <NotConfigured label="Text-to-speech provider" />
          <p className="mt-2 text-xs text-text-muted">Added in a later phase — no TTS provider is integrated yet.</p>
        </Card>

        <Card title="Visual generation">
          <NotConfigured label="Diagram / image generation provider" />
          <p className="mt-2 text-xs text-text-muted">
            Equations already render via KaTeX (reusing the AI Coach&apos;s renderer). Diagram/illustration generation
            is a later phase.
          </p>
        </Card>

        <Card title="Video rendering">
          <NotConfigured label="Rendering engine" />
          <p className="mt-2 text-xs text-text-muted">No render job system exists yet — this app has no background-job infrastructure today.</p>
        </Card>

        <Card title="Storage">
          <NotConfigured label="Media storage provider" />
          <p className="mt-2 text-xs text-text-muted">No file/blob storage is integrated anywhere in this app yet.</p>
        </Card>

        <Card title="YouTube">
          <NotConfigured label="YouTube channel connection" />
          <p className="mt-2 text-xs text-text-muted">OAuth and upload flow are a later phase. Uploads will default to Private/Unlisted, never Public automatically.</p>
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
