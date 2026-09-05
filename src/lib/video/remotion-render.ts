import { renderMediaOnLambda } from "@remotion/lambda/client";
import type { AwsRegion } from "@remotion/lambda";
import { prisma } from "@/lib/prisma";
import type { VideoLessonProps } from "../../../remotion/types";

type ProjectForRender = {
  id: string;
  title: string;
  subject: { name: string };
  topic: string;
  aspectRatio: VideoLessonProps["project"]["aspectRatio"];
  scenes: {
    id: string;
    order: number;
    sceneType: string;
    title: string;
    estimatedDurationSec: number;
    narration: string | null;
    onScreenText: string | null;
    equation: string | null;
    diagramDescription: string | null;
    voiceAudioUrl: string | null;
    voiceDurationSec: number | null;
  }[];
};

/** Kicks off a real Remotion Lambda render for a queued job and records
 * the returned identifiers. Remotion's own infra does the actual
 * multi-minute render entirely outside this app; completion is reported
 * back via the webhook route, not by polling here. If this kickoff call
 * itself throws (bad credentials, function not found, etc.), the caller
 * marks the job FAILED immediately — it should never sit at QUEUED with
 * no explanation. */
export async function triggerRemotionRender(jobId: string, project: ProjectForRender) {
  const inputProps: VideoLessonProps = {
    project: {
      title: project.title,
      subjectName: project.subject.name,
      topic: project.topic,
      aspectRatio: project.aspectRatio,
    },
    scenes: project.scenes
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        order: s.order,
        sceneType: s.sceneType,
        title: s.title,
        estimatedDurationSec: s.estimatedDurationSec,
        narration: s.narration,
        onScreenText: s.onScreenText,
        equation: s.equation,
        diagramDescription: s.diagramDescription,
        voiceAudioUrl: s.voiceAudioUrl,
        voiceDurationSec: s.voiceDurationSec,
      })),
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: process.env.REMOTION_AWS_REGION as AwsRegion,
    functionName: process.env.REMOTION_FUNCTION_NAME!,
    serveUrl: process.env.REMOTION_SERVE_URL!,
    composition: "VideoLesson",
    codec: "h264",
    // New AWS accounts default to a concurrency quota as low as 10
    // (npx remotion lambda quotas) — stay under it until you request an
    // increase (remotion.dev/docs/lambda/troubleshooting/rate-limit).
    // Deliberately not 1: the deployed function's timeout is 120s, and a
    // single function rendering an entire multi-minute lesson start to
    // finish would itself time out — concurrency has to split the work
    // across enough functions that each one's share finishes in time.
    concurrency: 8,
    inputProps,
    webhook: {
      url: `${appUrl}/api/video-studio/render-jobs/remotion-webhook`,
      secret: process.env.REMOTION_WEBHOOK_SECRET!,
      customData: { jobId },
    },
  });

  await prisma.videoRenderJob.update({
    where: { id: jobId },
    data: { remotionRenderId: renderId, remotionBucketName: bucketName, status: "RENDERING", startedAt: new Date() },
  });
}
