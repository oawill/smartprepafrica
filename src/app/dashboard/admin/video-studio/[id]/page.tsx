import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { isVideoAiConfigured } from "@/lib/ai/video/provider";
import { isVoiceConfigured } from "@/lib/ai/voice/provider";
import { isBlobStorageConfigured } from "@/lib/storage/blob-storage";
import { ProjectEditor } from "@/app/dashboard/admin/video-studio/[id]/project-editor";

export default async function VideoProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminPagePermission("video_studio.view");
  const { id } = await params;

  const project = await prisma.videoProject.findUnique({
    where: { id },
    include: {
      subject: true,
      countryExam: { include: { country: true, exam: { include: { examBody: true } } } },
      examTopic: true,
      scenes: {
        orderBy: { order: "asc" },
        include: { question: { select: { id: true, prompt: true, correctOption: true } } },
      },
      createdBy: { select: { name: true } },
    },
  });
  if (!project) notFound();

  const canCreate = hasPermission(session.user.adminRole, "video_studio.create");
  const canReview = hasPermission(session.user.adminRole, "video_studio.review");

  return (
    <ProjectEditor
      project={project}
      canCreate={canCreate}
      canReview={canReview}
      aiConfigured={isVideoAiConfigured()}
      voiceConfigured={isVoiceConfigured() && isBlobStorageConfigured()}
    />
  );
}
