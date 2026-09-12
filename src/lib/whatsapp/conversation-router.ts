import type { ExamType, WhatsAppFlowState, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp/messaging";
import { createLinkToken, findAccountByPhone } from "@/lib/whatsapp/linking";
import {
  MAIN_MENU_TEXT,
  HELP_TEXT,
  OPTED_OUT_CONFIRMATION_TEXT,
  OPTED_IN_CONFIRMATION_TEXT,
  UNSUBSCRIBED_TEXT,
  parseMainMenuChoice,
  parseGlobalCommand,
} from "@/lib/whatsapp/menu";
import {
  EXAM_PREP_PROMPT,
  parseExamChoice,
  getSubjectsForExam,
  formatSubjectListPrompt,
  parseSubjectChoice,
  startExamPrepSession,
  formatQuestionPrompt,
  parseOptionChoice,
  answerCurrentQuestion,
  formatSummary,
  getCurrentQuestion,
} from "@/lib/whatsapp/exam-prep";
import { getWhatsAppProgressSummary } from "@/lib/whatsapp/progress";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://smartprepafrica.com";
}

async function reply(phoneNumber: string, whatsappAccountId: string | undefined, body: string) {
  await sendWhatsAppMessage(phoneNumber, body, whatsappAccountId);
}

async function getOrCreateState(whatsappAccountId: string) {
  return prisma.whatsAppConversationState.upsert({
    where: { whatsappAccountId },
    update: {},
    create: { whatsappAccountId },
  });
}

async function setState(
  whatsappAccountId: string,
  state: WhatsAppFlowState,
  context: Record<string, unknown> | null = null
) {
  const data = { state, context: (context ?? undefined) as Prisma.InputJsonValue | undefined };
  await prisma.whatsAppConversationState.upsert({
    where: { whatsappAccountId },
    update: data,
    create: { whatsappAccountId, ...data },
  });
}

/** The single entry point every inbound WhatsApp message goes
 * through (called from the webhook route once the signature has been
 * verified) — never trusts the phone number alone as identity; an
 * unlinked number only ever gets the link prompt. */
export async function handleInboundMessage(phoneNumber: string, body: string): Promise<void> {
  const account = await findAccountByPhone(phoneNumber);

  if (!account) {
    const token = await createLinkToken(phoneNumber);
    const link = `${baseUrl()}/link-whatsapp?token=${token}`;
    await reply(
      phoneNumber,
      undefined,
      `Welcome to SmartPrepAfrica Learning 🎓\nTo use SmartPrepAfrica on WhatsApp, please connect this WhatsApp number to your SmartPrepAfrica account.\n\nLINK MY ACCOUNT: ${link}`
    );
    return;
  }

  const globalCommand = parseGlobalCommand(body);

  if (!account.whatsappEnabled) {
    if (globalCommand === "START") {
      await prisma.whatsAppAccount.update({
        where: { id: account.id },
        data: { whatsappEnabled: true, optInAt: new Date(), optOutAt: null },
      });
      await reply(phoneNumber, account.id, OPTED_IN_CONFIRMATION_TEXT);
      return;
    }
    await reply(phoneNumber, account.id, UNSUBSCRIBED_TEXT);
    return;
  }

  if (globalCommand === "STOP") {
    await prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: { whatsappEnabled: false, optOutAt: new Date() },
    });
    await reply(phoneNumber, account.id, OPTED_OUT_CONFIRMATION_TEXT);
    return;
  }

  if (globalCommand === "HELP") {
    await reply(phoneNumber, account.id, HELP_TEXT);
    return;
  }

  if (globalCommand === "MENU") {
    await setState(account.id, "MAIN_MENU");
    await reply(phoneNumber, account.id, MAIN_MENU_TEXT);
    return;
  }

  const state = await getOrCreateState(account.id);
  const context = (state.context as Record<string, unknown> | null) ?? {};

  switch (state.state) {
    case "MAIN_MENU": {
      const choice = parseMainMenuChoice(body);
      if (choice === "EXAM_PREP") {
        await setState(account.id, "AWAITING_EXAM");
        await reply(phoneNumber, account.id, EXAM_PREP_PROMPT);
        return;
      }
      if (choice === "DAILY_PRACTICE") {
        // Daily Practice reuses the same Exam Prep flow, entering
        // directly at exam selection — a dedicated curated "question
        // of the day" is a natural follow-on, not built this phase.
        await setState(account.id, "AWAITING_EXAM");
        await reply(phoneNumber, account.id, EXAM_PREP_PROMPT);
        return;
      }
      if (choice === "PROGRESS") {
        const summary = await getWhatsAppProgressSummary(account.userId);
        await reply(phoneNumber, account.id, summary);
        return;
      }
      if (choice === "HELP") {
        await reply(phoneNumber, account.id, HELP_TEXT);
        return;
      }
      await reply(phoneNumber, account.id, MAIN_MENU_TEXT);
      return;
    }

    case "AWAITING_EXAM": {
      const exam = parseExamChoice(body);
      if (!exam) {
        await reply(phoneNumber, account.id, `Sorry, I didn't catch that.\n\n${EXAM_PREP_PROMPT}`);
        return;
      }
      const subjects = await getSubjectsForExam(exam);
      if (subjects.length === 0) {
        await setState(account.id, "MAIN_MENU");
        await reply(
          phoneNumber,
          account.id,
          `No subjects are available for that exam yet. Reply MENU to try something else.`
        );
        return;
      }
      await setState(account.id, "AWAITING_SUBJECT", { exam, subjects });
      await reply(phoneNumber, account.id, formatSubjectListPrompt(exam, subjects));
      return;
    }

    case "AWAITING_SUBJECT": {
      const exam = context.exam as ExamType | undefined;
      const subjects = (context.subjects as { id: string; name: string }[] | undefined) ?? [];
      if (!exam) {
        await setState(account.id, "MAIN_MENU");
        await reply(phoneNumber, account.id, MAIN_MENU_TEXT);
        return;
      }
      const subject = parseSubjectChoice(body, subjects);
      if (!subject) {
        await reply(
          phoneNumber,
          account.id,
          `Sorry, I didn't catch that.\n\n${formatSubjectListPrompt(exam, subjects)}`
        );
        return;
      }
      const session = await startExamPrepSession(account.userId, exam, subject.id);
      if (!session) {
        await setState(account.id, "MAIN_MENU");
        await reply(phoneNumber, account.id, `No questions are available for that yet. Reply MENU to try something else.`);
        return;
      }
      await setState(account.id, "IN_PRACTICE", { attemptId: session.attemptId });
      await reply(phoneNumber, account.id, formatQuestionPrompt(session.question));
      return;
    }

    case "IN_PRACTICE": {
      const attemptId = context.attemptId as string | undefined;
      if (!attemptId) {
        await setState(account.id, "MAIN_MENU");
        await reply(phoneNumber, account.id, MAIN_MENU_TEXT);
        return;
      }
      const option = parseOptionChoice(body);
      if (!option) {
        await reply(phoneNumber, account.id, `Please reply with a letter, e.g. A, B, C or D.`);
        return;
      }

      const current = await getCurrentQuestion(attemptId);
      if (!current) {
        await setState(account.id, "MAIN_MENU");
        await reply(phoneNumber, account.id, MAIN_MENU_TEXT);
        return;
      }

      const result = await answerCurrentQuestion(account.userId, attemptId, current.id, option);
      const feedback = result.isCorrect ? "✅ Correct!" : "❌ Not quite.";
      const explanationText = result.explanation ? `\n\n${result.explanation}` : "";

      if (result.finished && result.summary) {
        await setState(account.id, "MAIN_MENU");
        await reply(phoneNumber, account.id, `${feedback}${explanationText}\n\n${formatSummary(result.summary)}`);
        return;
      }

      if (result.nextQuestion) {
        await reply(
          phoneNumber,
          account.id,
          `${feedback}${explanationText}\n\n${formatQuestionPrompt(result.nextQuestion)}`
        );
      }
      return;
    }

    default: {
      await setState(account.id, "MAIN_MENU");
      await reply(phoneNumber, account.id, MAIN_MENU_TEXT);
    }
  }
}
