"use server";

import { redirect } from "next/navigation";
import type { AiCoachMode } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createConversation,
  listConversations,
  getConversationMessages,
  deleteConversation,
  rateMessage,
} from "@/lib/ai/coach-service";

export async function startConversation(params: {
  courseId?: string | null;
  lessonId?: string | null;
  mode: AiCoachMode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  let lessonTitle: string | null = null;
  let lessonTopic: string | null = null;
  let courseTitle: string | null = null;
  let subjectId: string | null = null;

  if (params.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      select: {
        title: true,
        topic: true,
        module: { select: { course: { select: { title: true, subjectId: true } } } },
      },
    });
    if (lesson) {
      lessonTitle = lesson.title;
      lessonTopic = lesson.topic;
      courseTitle = lesson.module.course.title;
      subjectId = lesson.module.course.subjectId;
    }
  } else if (params.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { title: true, subjectId: true },
    });
    if (course) {
      courseTitle = course.title;
      subjectId = course.subjectId;
    }
  }

  const conversation = await createConversation({
    userId: session.user.id,
    courseId: params.courseId,
    lessonId: params.lessonId,
    subjectId,
    mode: params.mode,
    lessonTitle,
    lessonTopic,
    courseTitle,
  });

  return { id: conversation.id, title: conversation.title };
}

export async function fetchConversations() {
  const session = await auth();
  if (!session) redirect("/login");
  return listConversations(session.user.id);
}

export async function fetchConversationMessages(conversationId: string) {
  const session = await auth();
  if (!session) redirect("/login");
  return getConversationMessages(conversationId, session.user.id);
}

export async function removeConversation(conversationId: string) {
  const session = await auth();
  if (!session) redirect("/login");
  await deleteConversation(conversationId, session.user.id);
}

export async function submitMessageRating(messageId: string, rating: 1 | -1) {
  const session = await auth();
  if (!session) redirect("/login");
  await rateMessage(messageId, session.user.id, rating);
}
