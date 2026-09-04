import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/admin/audit";
import { requireActionPermission } from "@/lib/admin/authz";
import { isYouTubeConfigured } from "@/lib/youtube/config";
import { getValidAccessToken, uploadVideo } from "@/lib/youtube/client";

// Bounded by the deployment platform's own ceiling regardless of this
// value (Vercel Hobby caps well below this) — set high since a real
// lesson video upload can take a while once real renders exist.
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActionPermission("video_studio.create");
  const { id: projectId } = await params;

  if (!isYouTubeConfigured()) {
    return NextResponse.json({ error: "YouTube is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and YOUTUBE_TOKEN_ENCRYPTION_KEY." }, { status: 400 });
  }
  const connection = await prisma.youTubeConnection.findFirst();
  if (!connection) {
    return NextResponse.json({ error: "No YouTube channel is connected. Connect one in Settings." }, { status: 400 });
  }

  const project = await prisma.videoProject.findUnique({
    where: { id: projectId },
    include: {
      subject: true,
      countryExam: { include: { exam: { include: { examBody: true } } } },
      renderJobs: { orderBy: { queuedAt: "desc" }, take: 1 },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (project.youtubeUploadStatus === "UPLOADING" || project.youtubeUploadStatus === "UPLOADED") {
    return NextResponse.json({ error: "This project has already been uploaded or is uploading." }, { status: 400 });
  }
  const latestRenderJob = project.renderJobs[0];
  if (!latestRenderJob || latestRenderJob.status !== "COMPLETE" || !latestRenderJob.outputUrl) {
    return NextResponse.json({ error: "Render the video before publishing to YouTube." }, { status: 400 });
  }

  await prisma.videoProject.update({ where: { id: projectId }, data: { youtubeUploadStatus: "UPLOADING", youtubeUploadError: null } });

  try {
    const videoRes = await fetch(latestRenderJob.outputUrl);
    if (!videoRes.ok || !videoRes.body) {
      throw new Error(`Could not fetch rendered video (${videoRes.status}).`);
    }
    const sizeBytes = Number(videoRes.headers.get("content-length") ?? 0);
    if (!sizeBytes) {
      throw new Error("Rendered video has no readable content-length.");
    }

    const accessToken = await getValidAccessToken();
    const description = `${project.subject.name} — ${project.topic}\n${project.countryExam.exam.name} (${project.countryExam.exam.examBody.name})`;
    const youtubeVideoId = await uploadVideo({
      accessToken,
      stream: videoRes.body,
      sizeBytes,
      title: project.title,
      description,
      privacyStatus: "private",
    });

    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        youtubeVideoId,
        youtubeUploadStatus: "UPLOADED",
        youtubePrivacyStatus: "private",
        youtubePublishedAt: new Date(),
        status: "PUBLISHED",
      },
    });
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "VIDEO_YOUTUBE_UPLOAD_SUCCEEDED",
      resourceType: "VideoProject",
      resourceId: projectId,
      result: "SUCCESS",
      after: { youtubeVideoId },
    });

    return NextResponse.json({ ok: true, youtubeVideoId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    await prisma.videoProject.update({ where: { id: projectId }, data: { youtubeUploadStatus: "FAILED", youtubeUploadError: message } });
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "VIDEO_YOUTUBE_UPLOAD_FAILED",
      resourceType: "VideoProject",
      resourceId: projectId,
      result: "FAILURE",
      after: { error: message },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
