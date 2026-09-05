import { appRouterWebhook } from "@remotion/lambda/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/admin/audit";

function jobIdFrom(customData: Record<string, unknown> | null): string | null {
  const jobId = customData?.jobId;
  return typeof jobId === "string" ? jobId : null;
}

async function markComplete(jobId: string, outputUrl: string | undefined) {
  const existing = await prisma.videoRenderJob.findUniqueOrThrow({ where: { id: jobId } });
  // Remotion's success webhook doesn't hand us the rendered video's actual
  // playback duration (timeToFinish is wall-clock render time, not that) —
  // compute it the same way remotion/Root.tsx's calculateMetadata does,
  // from the project's own scenes.
  const scenes = await prisma.videoScene.findMany({ where: { projectId: existing.projectId }, select: { estimatedDurationSec: true, voiceDurationSec: true } });
  const outputDurationSec = scenes.reduce((sum, s) => sum + (s.voiceDurationSec ?? s.estimatedDurationSec), 0);

  const job = await prisma.videoRenderJob.update({
    where: { id: jobId },
    data: { status: "COMPLETE", outputUrl, outputDurationSec, completedAt: new Date() },
  });
  await prisma.videoProject.update({ where: { id: job.projectId }, data: { status: "RENDER_COMPLETE" } });
  await logAudit({
    action: "VIDEO_RENDER_JOB_COMPLETE",
    resourceType: "VideoRenderJob",
    resourceId: jobId,
    result: "SUCCESS",
    after: { outputUrl },
  });
}

async function markFailed(jobId: string, errorMessage: string) {
  const job = await prisma.videoRenderJob.update({
    where: { id: jobId },
    data: { status: "FAILED", errorMessage, completedAt: new Date() },
  });
  await prisma.videoProject.update({ where: { id: job.projectId }, data: { status: "RENDER_FAILED" } });
  await logAudit({
    action: "VIDEO_RENDER_JOB_FAILED",
    resourceType: "VideoRenderJob",
    resourceId: jobId,
    result: "FAILURE",
    after: { error: errorMessage },
  });
}

export const POST = appRouterWebhook({
  secret: process.env.REMOTION_WEBHOOK_SECRET ?? "",
  onSuccess: async (payload) => {
    const jobId = jobIdFrom(payload.customData);
    if (!jobId) return;
    await markComplete(jobId, payload.outputUrl);
  },
  onError: async (payload) => {
    const jobId = jobIdFrom(payload.customData);
    if (!jobId) return;
    const message = payload.errors[0]?.message ?? "Render failed.";
    await markFailed(jobId, message);
  },
  onTimeout: async (payload) => {
    const jobId = jobIdFrom(payload.customData);
    if (!jobId) return;
    await markFailed(jobId, "Render timed out.");
  },
});

export const OPTIONS = POST;
