import type { AiCoachMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { estimateCostKobo } from "@/lib/ai/pricing";
import { getCoachModelId } from "@/lib/ai/provider";

function titleFor(params: {
  mode: AiCoachMode;
  lessonTitle?: string | null;
  lessonTopic?: string | null;
  courseTitle?: string | null;
}) {
  if (params.lessonTopic) return `${params.lessonTopic} Help`;
  if (params.lessonTitle) return params.lessonTitle;
  if (params.courseTitle) return `${params.courseTitle} Q&A`;
  switch (params.mode) {
    case "EXAM_PREP":
      return "Exam Prep Session";
    case "STUDY_PLAN":
      return "Study Plan";
    case "QUIZ_ME":
      return "Quiz Me Session";
    case "PRACTICE":
      return "Practice Session";
    default:
      return "Study Coach Chat";
  }
}

export async function createConversation(params: {
  userId: string;
  courseId?: string | null;
  lessonId?: string | null;
  subjectId?: string | null;
  mode: AiCoachMode;
  lessonTitle?: string | null;
  lessonTopic?: string | null;
  courseTitle?: string | null;
}) {
  return prisma.aiConversation.create({
    data: {
      userId: params.userId,
      courseId: params.courseId ?? undefined,
      lessonId: params.lessonId ?? undefined,
      subjectId: params.subjectId ?? undefined,
      mode: params.mode,
      title: titleFor(params),
    },
  });
}

export async function assertOwnsConversation(conversationId: string, userId: string) {
  const conversation = await prisma.aiConversation.findUnique({
    where: { id: conversationId },
    select: { userId: true },
  });
  if (!conversation || conversation.userId !== userId) {
    throw new Error("Conversation not found.");
  }
}

export async function persistMessage(
  conversationId: string,
  role: "USER" | "ASSISTANT" | "SYSTEM",
  content: string,
  metadata?: Record<string, unknown>,
  id?: string
) {
  await prisma.$transaction([
    prisma.aiMessage.create({
      data: { id, conversationId, role, content, metadata: metadata as never },
    }),
    prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

export async function logUsage(params: {
  userId: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
}) {
  await prisma.aiUsageLog.create({
    data: {
      userId: params.userId,
      feature: params.feature,
      model: getCoachModelId(),
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      estimatedCostKobo: estimateCostKobo(params.inputTokens, params.outputTokens),
    },
  });
}

export async function listConversations(userId: string) {
  return prisma.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, mode: true, updatedAt: true, courseId: true, lessonId: true },
  });
}

export async function getConversationMessages(conversationId: string, userId: string) {
  await assertOwnsConversation(conversationId, userId);
  return prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteConversation(conversationId: string, userId: string) {
  await assertOwnsConversation(conversationId, userId);
  await prisma.aiConversation.delete({ where: { id: conversationId } });
}

export async function rateMessage(messageId: string, userId: string, rating: 1 | -1) {
  const message = await prisma.aiMessage.findUnique({
    where: { id: messageId },
    select: { conversation: { select: { userId: true } }, metadata: true },
  });
  if (!message || message.conversation.userId !== userId) {
    throw new Error("Message not found.");
  }
  const metadata = (message.metadata as Record<string, unknown> | null) ?? {};
  await prisma.aiMessage.update({
    where: { id: messageId },
    data: { metadata: { ...metadata, rating } },
  });
}
