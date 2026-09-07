import { streamText, convertToModelMessages, type UIMessage } from "ai";
import type { AiCoachMode } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getCoachModel, isAiCoachConfigured } from "@/lib/ai/provider";
import { buildCoachContext, type CoachContext } from "@/lib/ai/context-builder";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { checkUsageAllowance } from "@/lib/ai/limits";
import { persistMessage, logUsage, assertOwnsConversation } from "@/lib/ai/coach-service";
import { logConfusionSignal } from "@/lib/ai/mastery-service";
import { prisma } from "@/lib/prisma";

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

type CoachRequestBody = {
  messages: UIMessage[];
  conversationId: string;
  courseId?: string | null;
  lessonId?: string | null;
  chapterId?: string | null;
  mode: AiCoachMode;
  focusQuestion?: CoachContext["focusQuestion"];
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Sign in required.", { status: 401 });
  }

  if (!isAiCoachConfigured()) {
    return new Response(
      "AI Coach isn't configured yet. An administrator needs to add an ANTHROPIC_API_KEY.",
      { status: 503 }
    );
  }

  const { messages, conversationId, courseId, lessonId, chapterId, mode, focusQuestion } =
    (await req.json()) as CoachRequestBody;

  try {
    await assertOwnsConversation(conversationId, session.user.id);
  } catch {
    return new Response("Conversation not found.", { status: 404 });
  }

  // Sent as metadata on the last (current) user message rather than a
  // top-level body field — see coach-panel.tsx for why.
  const lastUserMessage = messages[messages.length - 1];
  const confusionStage =
    lastUserMessage?.role === "user" && lastUserMessage.metadata
      ? (lastUserMessage.metadata as { confusionStage?: number }).confusionStage ?? null
      : null;

  const usage = await checkUsageAllowance(session.user.id);
  if (!usage.allowed) {
    await logUsage({
      userId: session.user.id,
      feature: "coach_chat_blocked",
      inputTokens: 0,
      outputTokens: 0,
    });
    return new Response(
      `You've reached this month's AI Tutor limit (${usage.limit} messages on the ${usage.plan} plan). It resets next month, or upgrade for more.`,
      { status: 429 }
    );
  }

  if (lastUserMessage?.role === "user") {
    const text = extractText(lastUserMessage);
    if (text.trim()) {
      await persistMessage(conversationId, "USER", text);
    }
  }

  const context = await buildCoachContext({
    userId: session.user.id,
    courseId,
    lessonId,
    chapterId,
    mode,
    focusQuestion,
    confusionStage,
  });
  const system = buildSystemPrompt(context);

  // Repeated confusion on the same concept is a useful signal for
  // admins/teachers, but is deliberately NOT fed into StudentTopicMastery's
  // EMA (see logConfusionSignal) — expressing confusion isn't a graded
  // attempt. Fire-and-forget: never block the response on this.
  if (confusionStage && confusionStage >= 2 && lessonId && context.lesson?.topic && context.course?.subject) {
    prisma.lesson
      .findUnique({ where: { id: lessonId }, select: { module: { select: { course: { select: { subjectId: true } } } } } })
      .then((row) => {
        const subjectId = row?.module.course.subjectId;
        if (subjectId && context.lesson?.topic) {
          return logConfusionSignal({ userId: session.user.id, subjectId, topic: context.lesson.topic });
        }
      })
      .catch((e) => console.error("Failed to log confusion signal:", e));
  }

  // Shared between the stream (so the client's message id matches) and the
  // DB row we persist in onFinish — otherwise thumbs-up/down and other
  // per-message actions would reference an id that only exists client-side.
  const assistantMessageId = crypto.randomUUID();

  const result = streamText({
    model: getCoachModel(),
    system,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text, usage: tokenUsage }) => {
      if (text.trim()) {
        await persistMessage(conversationId, "ASSISTANT", text, undefined, assistantMessageId);
      }
      await logUsage({
        userId: session.user.id,
        feature: "coach_chat",
        inputTokens: tokenUsage.inputTokens ?? 0,
        outputTokens: tokenUsage.outputTokens ?? 0,
      });
    },
    onError: (error) => {
      console.error("AI Coach stream error:", error);
      logUsage({
        userId: session.user.id,
        feature: "coach_chat_error",
        inputTokens: 0,
        outputTokens: 0,
      }).catch((e) => console.error("Failed to log AI Coach error usage:", e));
    },
  });

  return result.toUIMessageStreamResponse({ generateMessageId: () => assistantMessageId });
}
