"use server";

import { redirect, notFound } from "next/navigation";
import type { SatSection, Difficulty } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { recordAnswer } from "@/lib/sat/attempt-service";
import { recordSkillAttempt } from "@/lib/sat/mastery-service";
import {
  createDrillAttempt,
  createAdaptiveDrillAttempt,
  submitDrillAttempt,
  practiceAnotherLikeThis,
} from "@/lib/sat/drill-service";
import type { SatDrillItem } from "@/components/sat/sat-drill-runner";

export async function startDrill(formData: FormData) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const section = formData.get("section") as SatSection;
  const domain = (formData.get("domain") as string) || undefined;
  const skill = (formData.get("skill") as string) || undefined;
  const size = Number(formData.get("size")) || SAT_CONFIG.drill.sizes.FOCUS;
  const timer = formData.get("timer") === "on" ? "on" : "off";

  const attemptId = await createDrillAttempt({ userId: session.user.id, section, domain, skill, size });
  redirect(`/international-exams/sat/drill/session/${attemptId}?timer=${timer}`);
}

export async function startAdaptiveDrill(formData: FormData) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const timer = formData.get("timer") === "on" ? "on" : "off";
  const attemptId = await createAdaptiveDrillAttempt(session.user.id, SAT_CONFIG.drill.adaptiveDefaultSize);
  redirect(`/international-exams/sat/drill/session/${attemptId}?timer=${timer}`);
}

export async function startTodaysDrill(formData: FormData) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const timer = formData.get("timer") === "on" ? "on" : "off";
  const attemptId = await createAdaptiveDrillAttempt(session.user.id, SAT_CONFIG.drill.dailyDrillSize);
  redirect(`/international-exams/sat/drill/session/${attemptId}?timer=${timer}`);
}

/** Saves the answer, records the mastery signal immediately (not batched
 * at drill submission, so mastery stays live even if abandoned early),
 * and returns the reveal payload the drill runner needs to show
 * correct/incorrect + explanation right away. */
export async function saveDrillAnswer(
  itemId: string,
  answer: { selectedOption?: string; numericAnswer?: string }
): Promise<{ isCorrect: boolean | null }> {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const { isCorrect } = await recordAnswer(itemId, session.user.id, answer);

  const item = await prisma.satAttemptItem.findUnique({
    where: { id: itemId },
    select: { content: { select: { section: true, domain: true, skill: true } } },
  });
  if (item && isCorrect !== null) {
    await recordSkillAttempt({
      userId: session.user.id,
      section: item.content.section,
      domain: item.content.domain,
      skill: item.content.skill,
      isCorrect,
    });
  }

  return { isCorrect };
}

export async function submitDrill(attemptId: string) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await submitDrillAttempt(attemptId, session.user.id);
  redirect(`/international-exams/sat/drill/results/${attemptId}`);
}

/** Starts a fresh drill targeting the (section, domain, skill) bucket
 * with the lowest accuracy in the given completed drill — "Retry Weak
 * Skills" on the Drill Complete screen. */
export async function retryWeakSkills(formData: FormData) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const attemptId = formData.get("attemptId") as string;
  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();

  const buckets = new Map<string, { section: SatSection; domain: string; skill?: string; correct: number; total: number }>();
  for (const item of attempt.items) {
    const key = `${item.content.section}::${item.content.domain}::${item.content.skill ?? ""}`;
    const bucket = buckets.get(key) ?? {
      section: item.content.section,
      domain: item.content.domain,
      skill: item.content.skill ?? undefined,
      correct: 0,
      total: 0,
    };
    bucket.total += 1;
    if (item.isCorrect) bucket.correct += 1;
    buckets.set(key, bucket);
  }

  const weakest = [...buckets.values()].sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
  if (!weakest) redirect("/international-exams/sat/drill");

  const newAttemptId = await createDrillAttempt({
    userId: session.user.id,
    section: weakest.section,
    domain: weakest.domain,
    skill: weakest.skill,
    size: SAT_CONFIG.drill.sizes.FOCUS,
  });
  redirect(`/international-exams/sat/drill/session/${newAttemptId}?timer=off`);
}

export async function practiceAnother(itemId: string): Promise<SatDrillItem | null> {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const item = await prisma.satAttemptItem.findUnique({
    where: { id: itemId },
    select: { attemptId: true },
  });
  if (!item) throw new Error("Drill item not found.");

  const result = await practiceAnotherLikeThis(item.attemptId, itemId, session.user.id);
  if (!result) return null;

  const newItem = await prisma.satAttemptItem.findUniqueOrThrow({
    where: { id: result.itemId },
    include: { content: true },
  });

  return {
    itemId: newItem.id,
    section: newItem.content.section,
    domain: newItem.content.domain,
    skill: newItem.content.skill,
    difficulty: newItem.content.difficulty as Difficulty,
    passage: newItem.content.passage,
    imageUrl: newItem.content.imageUrl,
    prompt: newItem.content.prompt,
    questionType: newItem.content.questionType,
    options: newItem.content.options,
    correctOption: newItem.content.correctOption,
    correctValue: newItem.content.correctValue,
    explanation: newItem.content.explanation,
    selectedOption: null,
    numericAnswer: null,
    isCorrect: null,
    flagged: false,
  };
}
