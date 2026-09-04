"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { suggestLearningObjectives } from "@/lib/ai/video/script-generator";

const createSchema = z.object({
  title: z.string().min(3),
  countryExamId: z.string().min(1),
  subjectId: z.string().min(1),
  topic: z.string().min(2),
  examTopicId: z.string().optional(),
  gradeLevel: z.string().optional(),
  videoType: z.enum([
    "FULL_LESSON",
    "QUICK_REVISION",
    "PAST_QUESTION_WALKTHROUGH",
    "CONCEPT_EXPLAINER",
    "WORKED_EXAMPLE",
    "PRACTICAL_DEMONSTRATION",
    "EXAM_TIPS",
    "TOPIC_SUMMARY",
    "YOUTUBE_SHORT",
    "REVISION_SHORT",
  ]),
  aspectRatio: z.enum(["LANDSCAPE_16_9", "VERTICAL_9_16", "SQUARE_1_1"]),
  targetDurationSec: z.coerce.number().int().min(15).max(3600),
  learningObjectives: z.array(z.string()).default([]),
});

export async function createVideoProject(formData: FormData) {
  const session = await requireActionPermission("video_studio.create");

  const objectives = formData
    .getAll("learningObjectives")
    .map((o) => (o as string).trim())
    .filter(Boolean);

  const data = createSchema.parse({
    title: formData.get("title"),
    countryExamId: formData.get("countryExamId"),
    subjectId: formData.get("subjectId"),
    topic: formData.get("topic"),
    examTopicId: (formData.get("examTopicId") as string) || undefined,
    gradeLevel: (formData.get("gradeLevel") as string) || undefined,
    videoType: formData.get("videoType"),
    aspectRatio: formData.get("aspectRatio"),
    targetDurationSec: formData.get("targetDurationSec"),
    learningObjectives: objectives,
  });

  const project = await prisma.videoProject.create({
    data: {
      title: data.title,
      countryExamId: data.countryExamId,
      subjectId: data.subjectId,
      topic: data.topic,
      examTopicId: data.examTopicId,
      gradeLevel: data.gradeLevel,
      videoType: data.videoType,
      aspectRatio: data.aspectRatio,
      targetDurationSec: data.targetDurationSec,
      learningObjectives: data.learningObjectives,
      createdById: session.user.id,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_PROJECT_CREATED",
    resourceType: "VideoProject",
    resourceId: project.id,
    result: "SUCCESS",
    after: { title: data.title, videoType: data.videoType, topic: data.topic },
  });

  redirect(`/dashboard/admin/video-studio/${project.id}`);
}

export async function suggestObjectivesAction(opts: {
  subjectName: string;
  topic: string;
  examLabel: string;
}): Promise<{ ok: true; objectives: string[] } | { ok: false; error: string }> {
  await requireActionPermission("video_studio.create");
  return suggestLearningObjectives(opts);
}
