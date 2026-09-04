"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

const MAX_TOPICS = 100;

const bulkSchema = z.object({
  countryExamId: z.string().min(1),
  subjectId: z.string().min(1),
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
  topicsRaw: z.string().min(1),
});

export async function createVideoProjectsBulk(formData: FormData) {
  const session = await requireActionPermission("video_studio.create");

  const data = bulkSchema.parse({
    countryExamId: formData.get("countryExamId"),
    subjectId: formData.get("subjectId"),
    gradeLevel: (formData.get("gradeLevel") as string) || undefined,
    videoType: formData.get("videoType"),
    aspectRatio: formData.get("aspectRatio"),
    targetDurationSec: formData.get("targetDurationSec"),
    topicsRaw: formData.get("topicsRaw"),
  });

  const topics = [
    ...new Set(
      data.topicsRaw
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_TOPICS);
  if (topics.length === 0) throw new Error("Enter at least one topic.");

  // Opportunistic ExamTopic linking — same idea as the single-project
  // wizard's topic dropdown, just matched by exact name instead of picked
  // from a list. Most topics won't match anything yet (the real ExamTopic
  // table is nearly empty) — that's fine, examTopicId stays null.
  const ces = await prisma.countryExamSubject.findUnique({
    where: { countryExamId_subjectId: { countryExamId: data.countryExamId, subjectId: data.subjectId } },
    include: { topics: true },
  });
  const topicIdByName = new Map(ces?.topics.map((t) => [t.name.toLowerCase(), t.id]) ?? []);

  const projects = await prisma.$transaction(
    topics.map((topic) =>
      prisma.videoProject.create({
        data: {
          title: `${topic} Explained`,
          countryExamId: data.countryExamId,
          subjectId: data.subjectId,
          topic,
          examTopicId: topicIdByName.get(topic.toLowerCase()),
          gradeLevel: data.gradeLevel,
          videoType: data.videoType,
          aspectRatio: data.aspectRatio,
          targetDurationSec: data.targetDurationSec,
          createdById: session.user.id,
        },
      }),
    ),
  );

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VIDEO_PROJECTS_BULK_CREATED",
    resourceType: "VideoProject",
    result: "SUCCESS",
    after: { count: projects.length, topics },
  });

  redirect(`/dashboard/admin/video-studio/library?created=${projects.length}`);
}
