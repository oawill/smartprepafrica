"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { logAudit } from "@/lib/admin/audit";
import { resolveParticipant } from "@/lib/learning/discussion-access";
import { awardXp } from "@/lib/gamification/xp-service";

export async function createDiscussion(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const courseId = formData.get("courseId") as string;
  const lessonId = (formData.get("lessonId") as string) || null;
  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const needsTutor = formData.get("needsTutor") === "on";

  if (!title || !body) {
    throw new Error("Add a title and a question before posting.");
  }

  const { course } = await resolveParticipant(session.user.id, courseId);

  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } });
    if (!lesson || lesson.module.courseId !== courseId) {
      throw new Error("That lesson doesn't belong to this course.");
    }
  }

  const discussion = await prisma.discussion.create({
    data: { courseId, lessonId, authorId: session.user.id, title, body, needsTutor },
  });

  await awardXp(session.user.id, "DISCUSSION_POST", discussion.id);

  if (needsTutor && course.teacher) {
    const author = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    const courseTitle = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    await notifyUser(
      course.teacher.userId,
      "TUTOR_REQUEST",
      `${author?.name} asked for tutor help in "${courseTitle?.title}".`,
      lessonId ? `/learn/${courseId}/lessons/${lessonId}` : `/learn/${courseId}`
    );
  }

  revalidatePath(lessonId ? `/learn/${courseId}/lessons/${lessonId}` : `/learn/${courseId}`);
}

export async function createDiscussionReply(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const discussionId = formData.get("discussionId") as string;
  const body = (formData.get("body") as string)?.trim();
  if (!body) throw new Error("Write a reply before submitting.");

  const discussion = await prisma.discussion.findUniqueOrThrow({
    where: { id: discussionId },
    select: { courseId: true, lessonId: true },
  });

  const { isTeacher, isAdmin } = await resolveParticipant(session.user.id, discussion.courseId);

  const reply = await prisma.discussionReply.create({
    data: { discussionId, authorId: session.user.id, body, isTutorReply: isTeacher || isAdmin },
  });

  await awardXp(session.user.id, "DISCUSSION_REPLY", reply.id);

  revalidatePath(
    discussion.lessonId ? `/learn/${discussion.courseId}/lessons/${discussion.lessonId}` : `/learn/${discussion.courseId}`
  );
}

export async function markDiscussionResolved(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const discussionId = formData.get("discussionId") as string;
  const discussion = await prisma.discussion.findUniqueOrThrow({
    where: { id: discussionId },
    select: { courseId: true, lessonId: true },
  });

  const { isTeacher, isAdmin } = await resolveParticipant(session.user.id, discussion.courseId);
  if (!isTeacher && !isAdmin) {
    throw new Error("Only the course's teacher or an admin can resolve this.");
  }

  await prisma.discussion.update({ where: { id: discussionId }, data: { resolvedAt: new Date() } });

  if (isAdmin && !isTeacher) {
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "DISCUSSION_RESOLVED",
      resourceType: "Discussion",
      resourceId: discussionId,
      result: "SUCCESS",
    });
  }

  revalidatePath(
    discussion.lessonId ? `/learn/${discussion.courseId}/lessons/${discussion.lessonId}` : `/learn/${discussion.courseId}`
  );
  revalidatePath("/dashboard/teacher/discussions");
  revalidatePath("/dashboard/admin/discussions");
}
