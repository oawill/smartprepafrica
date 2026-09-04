"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { generateVideoScript, regenerateVideoScene } from "@/lib/ai/video/script-generator";
import type { VideoSceneQuestionSource } from "@prisma/client";

async function projectContext(projectId: string) {
  const project = await prisma.videoProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { subject: true, countryExam: { include: { exam: { include: { examBody: true } } } } },
  });
  return {
    project,
    examLabel: `${project.countryExam.exam.name} (${project.countryExam.exam.examBody.name})`,
  };
}

type ActionResult = { ok: true } | { ok: false; error: string };

export async function generateScriptAction(projectId: string): Promise<ActionResult> {
  const session = await requireActionPermission("video_studio.create");
  const { project, examLabel } = await projectContext(projectId);

  await prisma.videoProject.update({ where: { id: projectId }, data: { status: "SCRIPT_GENERATING" } });

  const result = await generateVideoScript({
    projectId,
    subjectName: project.subject.name,
    topic: project.topic,
    gradeLevel: project.gradeLevel,
    videoType: project.videoType,
    targetDurationSec: project.targetDurationSec,
    learningObjectives: project.learningObjectives,
    examLabel,
  });

  if (!result.ok) {
    await prisma.videoProject.update({ where: { id: projectId }, data: { status: "DRAFT" } });
    return { ok: false, error: result.error };
  }

  await prisma.$transaction([
    prisma.videoScene.deleteMany({ where: { projectId } }),
    prisma.videoScene.createMany({
      data: result.scenes.map((s, i) => ({
        projectId,
        order: i + 1,
        sceneType: s.sceneType,
        title: s.title,
        estimatedDurationSec: s.estimatedDurationSec,
        narration: s.narration,
        onScreenText: s.onScreenText,
        visualDirection: s.visualDirection,
        animationInstructions: s.animationInstructions,
        learningObjective: s.learningObjective,
        equation: s.equation,
        diagramDescription: s.diagramDescription,
        questionSource: s.questionPrompt ? ("AI_DRAFT" as VideoSceneQuestionSource) : ("NONE" as VideoSceneQuestionSource),
        draftQuestionPrompt: s.questionPrompt,
        draftQuestionOptions: s.questionOptions ?? undefined,
        draftQuestionAnswer: s.questionAnswer,
        draftQuestionExplanation: s.questionExplanation,
      })),
    }),
    prisma.videoProject.update({ where: { id: projectId }, data: { status: "SCRIPT_READY" } }),
  ]);

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_SCRIPT_GENERATED",
    resourceType: "VideoProject",
    resourceId: projectId,
    result: "SUCCESS",
    after: { sceneCount: result.scenes.length, inputTokens: result.inputTokens, outputTokens: result.outputTokens },
  });

  revalidatePath(`/dashboard/admin/video-studio/${projectId}`);
  return { ok: true };
}

export async function regenerateSceneAction(sceneId: string, instructions?: string): Promise<ActionResult> {
  const session = await requireActionPermission("video_studio.create");
  const scene = await prisma.videoScene.findUniqueOrThrow({ where: { id: sceneId } });
  const { project, examLabel } = await projectContext(scene.projectId);

  const result = await regenerateVideoScene({
    projectId: scene.projectId,
    subjectName: project.subject.name,
    topic: project.topic,
    examLabel,
    sceneType: scene.sceneType,
    currentTitle: scene.title,
    instructions,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const s = result.scene;
  await prisma.videoScene.update({
    where: { id: sceneId },
    data: {
      title: s.title,
      estimatedDurationSec: s.estimatedDurationSec,
      narration: s.narration,
      onScreenText: s.onScreenText,
      visualDirection: s.visualDirection,
      animationInstructions: s.animationInstructions,
      learningObjective: s.learningObjective,
      equation: s.equation,
      diagramDescription: s.diagramDescription,
      questionSource: s.questionPrompt ? "AI_DRAFT" : scene.questionSource === "EXISTING_QUESTION" ? scene.questionSource : "NONE",
      draftQuestionPrompt: s.questionPrompt ?? scene.draftQuestionPrompt,
      draftQuestionOptions: s.questionOptions ?? scene.draftQuestionOptions ?? undefined,
      draftQuestionAnswer: s.questionAnswer ?? scene.draftQuestionAnswer,
      draftQuestionExplanation: s.questionExplanation ?? scene.draftQuestionExplanation,
      reviewStatus: "PENDING",
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_SCENE_REGENERATED",
    resourceType: "VideoScene",
    resourceId: sceneId,
    result: "SUCCESS",
  });

  revalidatePath(`/dashboard/admin/video-studio/${scene.projectId}`);
  return { ok: true };
}

export async function updateSceneAction(formData: FormData): Promise<ActionResult> {
  const session = await requireActionPermission("video_studio.create");
  const sceneId = formData.get("sceneId") as string;
  const scene = await prisma.videoScene.findUniqueOrThrow({ where: { id: sceneId } });

  await prisma.videoScene.update({
    where: { id: sceneId },
    data: {
      title: (formData.get("title") as string)?.trim() || scene.title,
      sceneType: formData.get("sceneType") as never,
      estimatedDurationSec: Number(formData.get("estimatedDurationSec")) || scene.estimatedDurationSec,
      narration: (formData.get("narration") as string) || null,
      onScreenText: (formData.get("onScreenText") as string) || null,
      visualDirection: (formData.get("visualDirection") as string) || null,
      animationInstructions: (formData.get("animationInstructions") as string) || null,
      learningObjective: (formData.get("learningObjective") as string) || null,
      equation: (formData.get("equation") as string) || null,
      diagramDescription: (formData.get("diagramDescription") as string) || null,
      reviewStatus: "PENDING",
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_SCENE_EDITED",
    resourceType: "VideoScene",
    resourceId: sceneId,
    result: "SUCCESS",
  });

  revalidatePath(`/dashboard/admin/video-studio/${scene.projectId}`);
  return { ok: true };
}

export async function reorderSceneAction(sceneId: string, direction: "up" | "down") {
  await requireActionPermission("video_studio.create");
  const scene = await prisma.videoScene.findUniqueOrThrow({ where: { id: sceneId } });
  const neighbor = await prisma.videoScene.findFirst({
    where: {
      projectId: scene.projectId,
      order: direction === "up" ? { lt: scene.order } : { gt: scene.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.videoScene.update({ where: { id: scene.id }, data: { order: -1 } }),
    prisma.videoScene.update({ where: { id: neighbor.id }, data: { order: scene.order } }),
    prisma.videoScene.update({ where: { id: scene.id }, data: { order: neighbor.order } }),
  ]);

  revalidatePath(`/dashboard/admin/video-studio/${scene.projectId}`);
}

export async function duplicateSceneAction(sceneId: string) {
  await requireActionPermission("video_studio.create");
  const scene = await prisma.videoScene.findUniqueOrThrow({ where: { id: sceneId } });
  await prisma.$transaction([
    prisma.videoScene.updateMany({
      where: { projectId: scene.projectId, order: { gt: scene.order } },
      data: { order: { increment: 1 } },
    }),
    prisma.videoScene.create({
      data: {
        projectId: scene.projectId,
        order: scene.order + 1,
        sceneType: scene.sceneType,
        title: `${scene.title} (copy)`,
        estimatedDurationSec: scene.estimatedDurationSec,
        narration: scene.narration,
        onScreenText: scene.onScreenText,
        visualDirection: scene.visualDirection,
        animationInstructions: scene.animationInstructions,
        learningObjective: scene.learningObjective,
        equation: scene.equation,
        diagramDescription: scene.diagramDescription,
        questionSource: scene.questionSource,
        questionId: scene.questionId,
        draftQuestionPrompt: scene.draftQuestionPrompt,
        draftQuestionOptions: scene.draftQuestionOptions ?? undefined,
        draftQuestionAnswer: scene.draftQuestionAnswer,
        draftQuestionExplanation: scene.draftQuestionExplanation,
      },
    }),
  ]);
  revalidatePath(`/dashboard/admin/video-studio/${scene.projectId}`);
}

export async function deleteSceneAction(sceneId: string) {
  const session = await requireActionPermission("video_studio.create");
  const scene = await prisma.videoScene.findUniqueOrThrow({ where: { id: sceneId } });
  await prisma.videoScene.delete({ where: { id: sceneId } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_SCENE_DELETED",
    resourceType: "VideoScene",
    resourceId: sceneId,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/video-studio/${scene.projectId}`);
}

export async function searchQuestionsAction(subjectId: string, query: string) {
  await requireActionPermission("video_studio.create");
  return prisma.question.findMany({
    where: {
      subjectId,
      status: "PUBLISHED",
      ...(query ? { prompt: { contains: query, mode: "insensitive" as const } } : {}),
    },
    select: { id: true, prompt: true, correctOption: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

export async function assignExistingQuestionAction(sceneId: string, questionId: string) {
  const session = await requireActionPermission("video_studio.create");
  const scene = await prisma.videoScene.update({
    where: { id: sceneId },
    data: { questionSource: "EXISTING_QUESTION", questionId, reviewStatus: "PENDING" },
  });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_SCENE_QUESTION_SET",
    resourceType: "VideoScene",
    resourceId: sceneId,
    result: "SUCCESS",
    after: { questionSource: "EXISTING_QUESTION", questionId },
  });
  revalidatePath(`/dashboard/admin/video-studio/${scene.projectId}`);
}

export async function clearSceneQuestionAction(sceneId: string) {
  const scene = await prisma.videoScene.update({
    where: { id: sceneId },
    data: {
      questionSource: "NONE",
      questionId: null,
      draftQuestionPrompt: null,
      draftQuestionOptions: undefined,
      draftQuestionAnswer: null,
      draftQuestionExplanation: null,
    },
  });
  revalidatePath(`/dashboard/admin/video-studio/${scene.projectId}`);
}

export async function updateProjectMetaAction(formData: FormData): Promise<ActionResult> {
  const session = await requireActionPermission("video_studio.create");
  const projectId = formData.get("projectId") as string;

  await prisma.videoProject.update({
    where: { id: projectId },
    data: {
      title: (formData.get("title") as string)?.trim() || undefined,
      description: (formData.get("description") as string) || null,
      ctaLabel: (formData.get("ctaLabel") as string) || null,
      ctaDestination: (formData.get("ctaDestination") as string) || null,
      campaignId: (formData.get("campaignId") as string) || null,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_PROJECT_UPDATED",
    resourceType: "VideoProject",
    resourceId: projectId,
    result: "SUCCESS",
  });

  revalidatePath(`/dashboard/admin/video-studio/${projectId}`);
  return { ok: true };
}

export async function submitForReviewAction(projectId: string) {
  const session = await requireActionPermission("video_studio.create");
  await prisma.videoProject.update({ where: { id: projectId }, data: { status: "NEEDS_REVIEW" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_PROJECT_SUBMITTED_FOR_REVIEW",
    resourceType: "VideoProject",
    resourceId: projectId,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/video-studio/${projectId}`);
}

export async function approveScriptAction(projectId: string) {
  const session = await requireActionPermission("video_studio.review");
  await prisma.videoProject.update({ where: { id: projectId }, data: { status: "SCRIPT_APPROVED" } });
  await prisma.videoScene.updateMany({ where: { projectId }, data: { reviewStatus: "APPROVED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_PROJECT_SCRIPT_APPROVED",
    resourceType: "VideoProject",
    resourceId: projectId,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/video-studio/${projectId}`);
}
