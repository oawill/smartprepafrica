import { prisma } from "@/lib/prisma";
import { computeSkillScore, computeDiagnosticOverallScore } from "@/lib/toefl/scoring";
import { countWords } from "@/lib/toefl/text";
import { uploadAudio } from "@/lib/storage/blob-storage";
import { isSpeakingEvaluationConfigured } from "@/lib/toefl/speaking-evaluator";
import { openAiSpeakingEvaluator } from "@/lib/toefl/openai-speaking-evaluator";
import { isWritingEvaluationConfigured } from "@/lib/toefl/writing-evaluator";
import { claudeWritingEvaluator } from "@/lib/toefl/claude-writing-evaluator";
import type { ToeflSkill } from "@prisma/client";

/** Every skill's practice attempt writes its score into a different
 * ToeflAttempt column — this is the one place that mapping lives, so
 * adding Speaking/Writing later only means adding two more entries here,
 * not touching every call site. Unit-tested for completeness in
 * tests/toefl/attempt-service.test.ts. */
export const SKILL_SCORE_FIELD: Record<ToeflSkill, "readingScore" | "listeningScore" | "speakingScore" | "writingScore"> = {
  READING: "readingScore",
  LISTENING: "listeningScore",
  SPEAKING: "speakingScore",
  WRITING: "writingScore",
};

export async function assertOwnedInProgressToeflAttempt(attemptId: string, userId: string) {
  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true, submittedAt: true },
  });
  if (!attempt || attempt.userId !== userId) {
    throw new Error("Attempt not found.");
  }
  if (attempt.submittedAt) {
    throw new Error("This attempt has already been submitted.");
  }
}

export async function createSkillPracticeAttempt(userId: string, skill: ToeflSkill): Promise<string> {
  const content = await prisma.toeflContent.findMany({
    where: { skill, status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
  });
  if (content.length === 0) {
    throw new Error("Practice content isn't available yet.");
  }

  const attempt = await prisma.toeflAttempt.create({
    data: {
      userId,
      kind: "SKILL_PRACTICE",
      skill,
      items: {
        create: content.map((c, i) => ({ contentId: c.id, order: i })),
      },
    },
  });

  return attempt.id;
}

/** Combines all published content across all 4 skills into a single
 * attempt — Reading/Listening items first (all of them, for a real MCQ
 * score), then one Writing prompt and one Speaking prompt for a full-skill
 * preview. `skill: null` marks it as covering all 4 skills, per the
 * schema's own comment on that field. Skips any skill with zero published
 * content rather than failing outright — only errors if literally nothing
 * exists anywhere yet. */
export async function createDiagnosticAttempt(userId: string): Promise<string> {
  const [reading, listening, writing, speaking] = await Promise.all([
    prisma.toeflContent.findMany({ where: { skill: "READING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findMany({ where: { skill: "LISTENING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findFirst({ where: { skill: "WRITING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findFirst({ where: { skill: "SPEAKING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
  ]);
  const ordered = [...reading, ...listening, ...(writing ? [writing] : []), ...(speaking ? [speaking] : [])];
  if (ordered.length === 0) {
    throw new Error("Diagnostic content isn't available yet.");
  }

  const attempt = await prisma.toeflAttempt.create({
    data: {
      userId,
      kind: "DIAGNOSTIC",
      skill: null,
      items: { create: ordered.map((c, i) => ({ contentId: c.id, order: i })) },
    },
  });

  return attempt.id;
}

/** Same composition as createDiagnosticAttempt but full-length: EVERY
 * published Writing and Speaking prompt (not just one preview each), for
 * a genuine full-skill mock exam rather than a quick readiness check.
 * Kept as its own function rather than parameterizing
 * createDiagnosticAttempt — each stays simple and readable, matching how
 * createSkillPracticeAttempt/createSingleItemAttempt already coexist as
 * separate functions for different attempt shapes. */
export async function createMockExamAttempt(userId: string): Promise<string> {
  const [reading, listening, writing, speaking] = await Promise.all([
    prisma.toeflContent.findMany({ where: { skill: "READING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findMany({ where: { skill: "LISTENING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findMany({ where: { skill: "WRITING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findMany({ where: { skill: "SPEAKING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
  ]);
  const ordered = [...reading, ...listening, ...writing, ...speaking];
  if (ordered.length === 0) {
    throw new Error("Mock exam content isn't available yet.");
  }

  const attempt = await prisma.toeflAttempt.create({
    data: {
      userId,
      kind: "MOCK_EXAM",
      skill: null,
      items: { create: ordered.map((c, i) => ({ contentId: c.id, order: i })) },
    },
  });

  return attempt.id;
}

/** Reading/Listening bundle every published item into one attempt (answer
 * a set of N). Writing and Speaking don't — a student picks exactly one
 * prompt, responds, submits — so this creates a single-item attempt
 * instead. Shared here (not duplicated per skill) since Speaking needs
 * the identical shape in the next step. */
export async function createSingleItemAttempt(userId: string, skill: ToeflSkill, contentId: string): Promise<string> {
  const content = await prisma.toeflContent.findUnique({ where: { id: contentId } });
  if (!content || content.status !== "PUBLISHED" || content.skill !== skill) {
    throw new Error("That prompt isn't available.");
  }

  const attempt = await prisma.toeflAttempt.create({
    data: {
      userId,
      kind: "SKILL_PRACTICE",
      skill,
      items: { create: [{ contentId, order: 0 }] },
    },
  });

  return attempt.id;
}

/** Shared save-answer logic for MCQ skills (Reading, Listening). Speaking
 * and Writing record free-form responses instead and will need their own
 * recording functions when those steps land. */
export async function recordMcqAnswer(itemId: string, userId: string, selectedOption: string) {
  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      attempt: { select: { id: true, userId: true, submittedAt: true } },
      content: { select: { correctOption: true } },
    },
  });
  if (item.attempt.userId !== userId) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  await prisma.toeflAttemptItem.update({
    where: { id: itemId },
    data: { selectedOption, isCorrect: selectedOption === item.content.correctOption },
  });
}

export async function submitSkillAttempt(attemptId: string, userId: string, skill: ToeflSkill) {
  await assertOwnedInProgressToeflAttempt(attemptId, userId);

  const items = await prisma.toeflAttemptItem.findMany({ where: { attemptId } });
  const correctCount = items.filter((i) => i.isCorrect).length;
  const score = computeSkillScore(correctCount, items.length);

  await prisma.toeflAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), [SKILL_SCORE_FIELD[skill]]: score },
  });
}

export async function saveWritingDraft(itemId: string, userId: string, text: string) {
  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { attempt: { select: { userId: true, submittedAt: true } } },
  });
  if (item.attempt.userId !== userId) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  await prisma.toeflAttemptItem.update({
    where: { id: itemId },
    data: { writingText: text, writingWordCount: countWords(text) },
  });
}

/** Real Claude-graded evaluation when configured; otherwise honestly
 * marks UNAVAILABLE — never a fabricated score. Shared by
 * submitFreeformAttempt (standalone Writing) and submitExamAttempt
 * (Diagnostic/Mock Exam finalize) so the same try/catch/persist logic
 * isn't duplicated in both places. Any evaluator error (network, bad
 * API key, malformed model output) is caught and persisted as FAILED
 * rather than blocking the student's submission. */
async function evaluateAndPersistWritingItem(item: {
  id: string;
  writingText: string | null;
  writingWordCount: number | null;
  content: { prompt: string };
}) {
  if (!isWritingEvaluationConfigured()) {
    await prisma.toeflAttemptItem.update({ where: { id: item.id }, data: { evalStatus: "UNAVAILABLE" } });
    return;
  }

  try {
    const result = await claudeWritingEvaluator.evaluateWritingResponse({
      promptText: item.content.prompt,
      responseText: item.writingText ?? "",
      wordCount: item.writingWordCount ?? 0,
    });
    await prisma.toeflAttemptItem.update({
      where: { id: item.id },
      data: {
        evalStatus: "EVALUATED",
        evalScore: result.estimatedScore,
        evalOrganization: result.organization,
        evalGrammar: result.grammar,
        evalVocabulary: result.vocabulary,
        evalClarity: result.clarity,
        evalTaskCompletion: result.taskCompletion,
        evalFeedback: result.feedback,
      },
    });
  } catch (err) {
    console.error(`Writing evaluation failed for item ${item.id}`, err);
    await prisma.toeflAttemptItem.update({ where: { id: item.id }, data: { evalStatus: "FAILED" } });
  }
}

/** Named generically (not "submitWritingAttempt") since it has no
 * writing-specific logic of its own — it just evaluates whatever items
 * exist on the attempt. Only ever called with Writing items today (its
 * one call site is Writing's standalone submit action; Speaking moved
 * to its own upload-time evaluation path in saveSpeakingRecording,
 * Step 9). */
export async function submitFreeformAttempt(attemptId: string, userId: string) {
  await assertOwnedInProgressToeflAttempt(attemptId, userId);

  const items = await prisma.toeflAttemptItem.findMany({ where: { attemptId }, include: { content: true } });
  await Promise.all(items.map((item) => evaluateAndPersistWritingItem(item)));

  await prisma.toeflAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date() },
  });
}

/** Shared by Speaking's own submit action and Diagnostic's/Mock Exam's —
 * uploads the recording and updates the item. Deliberately does NOT
 * touch attempt.submittedAt: Speaking's standalone flow finalizes right
 * after calling this, but Diagnostic's/Mock's multi-skill attempt isn't
 * done yet when its Speaking section finishes uploading.
 *
 * When configured, runs the real transcription+grading evaluation
 * synchronously right here (before returning) rather than leaving the
 * item at NOT_EVALUATED indefinitely — there's no background job
 * infrastructure in this app to pick that state up later, so "configured"
 * means "evaluate now." Any evaluator error is caught and persisted as
 * FAILED rather than blocking the recording upload itself. */
export async function saveSpeakingRecording(
  itemId: string,
  userId: string,
  opts: { data: Uint8Array; contentType: string; durationSec: number }
) {
  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { attempt: { select: { userId: true, submittedAt: true } }, content: { select: { prompt: true } } },
  });
  if (item.attempt.userId !== userId) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  const { url } = await uploadAudio({
    pathname: `toefl/speaking/${itemId}.webm`,
    data: opts.data,
    contentType: opts.contentType,
  });

  if (!isSpeakingEvaluationConfigured()) {
    await prisma.toeflAttemptItem.update({
      where: { id: itemId },
      data: { speakingAudioUrl: url, speakingDurationSec: opts.durationSec, evalStatus: "UNAVAILABLE" },
    });
    return;
  }

  await prisma.toeflAttemptItem.update({
    where: { id: itemId },
    data: { speakingAudioUrl: url, speakingDurationSec: opts.durationSec, evalStatus: "EVALUATING" },
  });

  try {
    const result = await openAiSpeakingEvaluator.evaluateSpeakingResponse({
      audioUrl: url,
      promptText: item.content.prompt,
      durationSec: opts.durationSec,
    });
    await prisma.toeflAttemptItem.update({
      where: { id: itemId },
      data: {
        evalStatus: "EVALUATED",
        evalScore: result.estimatedScore,
        evalFluency: result.fluency,
        evalPronunciation: result.pronunciation,
        evalGrammar: result.grammar,
        evalVocabulary: result.vocabulary,
        evalTaskCompletion: result.taskCompletion,
        evalFeedback: result.feedback,
      },
    });
  } catch (err) {
    console.error(`Speaking evaluation failed for item ${itemId}`, err);
    await prisma.toeflAttemptItem.update({ where: { id: itemId }, data: { evalStatus: "FAILED" } });
  }
}

/** Reading/Listening scores come from real correctness, same formula as
 * submitSkillAttempt. overallScore only ever averages skills that were
 * actually auto-scored (Reading/Listening), via
 * computeDiagnosticOverallScore — Writing/Speaking having real scores
 * now doesn't change that formula; whether they should count toward the
 * headline number is a deliberate product decision for later, not an
 * oversight. Contains no kind-specific logic, so it's shared by both
 * Diagnostic and Mock Exam (Step 10).
 *
 * Speaking items are NOT touched here — saveSpeakingRecording already
 * evaluated (or marked UNAVAILABLE for) each one at upload time, which
 * always runs before this finalize step. Only Writing items are
 * evaluated here, since Writing has no earlier per-item hook. */
export async function submitExamAttempt(attemptId: string, userId: string) {
  await assertOwnedInProgressToeflAttempt(attemptId, userId);

  const items = await prisma.toeflAttemptItem.findMany({ where: { attemptId }, include: { content: true } });
  const readingItems = items.filter((i) => i.content.skill === "READING");
  const listeningItems = items.filter((i) => i.content.skill === "LISTENING");
  const writingItems = items.filter((i) => i.content.skill === "WRITING");

  const readingScore = readingItems.length
    ? computeSkillScore(readingItems.filter((i) => i.isCorrect).length, readingItems.length)
    : null;
  const listeningScore = listeningItems.length
    ? computeSkillScore(listeningItems.filter((i) => i.isCorrect).length, listeningItems.length)
    : null;
  const overallScore = computeDiagnosticOverallScore([readingScore, listeningScore]);

  await Promise.all(writingItems.map((item) => evaluateAndPersistWritingItem(item)));

  await prisma.toeflAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), readingScore, listeningScore, overallScore },
  });
}
