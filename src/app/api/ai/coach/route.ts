import { streamText, convertToModelMessages, type UIMessage } from "ai";
import type { AiCoachMode } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getCoachModel, isAiCoachConfigured } from "@/lib/ai/provider";
import { buildCoachContext, type CoachContext } from "@/lib/ai/context-builder";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { checkUsageAllowance } from "@/lib/ai/limits";
import { persistMessage, logUsage, assertOwnsConversation } from "@/lib/ai/coach-service";

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

  const { messages, conversationId, courseId, lessonId, mode, focusQuestion } =
    (await req.json()) as CoachRequestBody;

  try {
    await assertOwnsConversation(conversationId, session.user.id);
  } catch {
    return new Response("Conversation not found.", { status: 404 });
  }

  const usage = await checkUsageAllowance(session.user.id);
  if (!usage.allowed) {
    await logUsage({
      userId: session.user.id,
      feature: "coach_chat_blocked",
      inputTokens: 0,
      outputTokens: 0,
    });
    return new Response(
      `You've reached today's AI Coach limit (${usage.limit} messages on the ${usage.plan} plan). It resets tomorrow, or upgrade for more.`,
      { status: 429 }
    );
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
    const text = extractText(lastMessage);
    if (text.trim()) {
      await persistMessage(conversationId, "USER", text);
    }
  }

  const context = await buildCoachContext({
    userId: session.user.id,
    courseId,
    lessonId,
    mode,
    focusQuestion,
  });
  const system = buildSystemPrompt(context);

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
