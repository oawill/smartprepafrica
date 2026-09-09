import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkAndAwardBadges } from "@/lib/gamification/badges";

export const XP_VALUES = {
  LESSON_COMPLETE: 10,
  COURSE_COMPLETE: 100,
  // Flat regardless of score — rewards practicing itself, not the result,
  // so a struggling student isn't earning less than a strong one for the
  // same effort. See the plan's Context section for why.
  EXAM_ATTEMPT: 15,
  DISCUSSION_POST: 5,
  DISCUSSION_REPLY: 5,
} as const;

export type XpEventType = keyof typeof XP_VALUES;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Pure — given the student's last-activity date and "now", returns the
 * updated streak fields. Same calendar day → unchanged. Exactly one day
 * later → +1. Any bigger gap (or first-ever activity, lastActivityDate
 * null) → resets to 1. Exported for direct unit testing since the
 * day-boundary arithmetic is exactly the kind of thing worth pinning
 * down with tests rather than trusting by inspection. */
export function computeStreakUpdate(
  lastActivityDate: Date | null,
  now: Date,
  currentStreakDays: number,
  longestStreakDays: number
): { currentStreakDays: number; longestStreakDays: number; lastActivityDate: Date } {
  const today = startOfDay(now);

  if (!lastActivityDate) {
    return { currentStreakDays: 1, longestStreakDays: Math.max(longestStreakDays, 1), lastActivityDate: today };
  }

  const last = startOfDay(lastActivityDate);
  const dayGap = Math.round((today.getTime() - last.getTime()) / MS_PER_DAY);

  if (dayGap === 0) {
    return { currentStreakDays, longestStreakDays, lastActivityDate: today };
  }
  if (dayGap === 1) {
    const next = currentStreakDays + 1;
    return { currentStreakDays: next, longestStreakDays: Math.max(longestStreakDays, next), lastActivityDate: today };
  }
  return { currentStreakDays: 1, longestStreakDays: Math.max(longestStreakDays, 1), lastActivityDate: today };
}

/** Idempotent XP award. Inserts the XpEvent first — a duplicate
 * (userId, type, sourceId) throws P2002, which we catch and treat as
 * "already awarded, nothing to do" (same pattern as
 * src/lib/practice/exam-drill-config.ts's getDrillConfig). Only a
 * genuinely new event increments StudentProfile.xp, updates the streak,
 * and checks for newly-qualifying badges — so re-completing an
 * already-completed lesson, or a retried form submission, never
 * double-awards. */
export async function awardXp(userId: string, type: XpEventType, sourceId: string): Promise<void> {
  const amount = XP_VALUES[type];

  try {
    await prisma.xpEvent.create({ data: { userId, type, sourceId, amount } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }
    throw error;
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { xp: true, currentStreakDays: true, longestStreakDays: true, lastActivityDate: true },
  });
  if (!profile) return; // Non-student accounts (e.g. a teacher replying) simply earn no XP.

  const streak = computeStreakUpdate(
    profile.lastActivityDate,
    new Date(),
    profile.currentStreakDays,
    profile.longestStreakDays
  );

  await prisma.studentProfile.update({
    where: { userId },
    data: {
      xp: profile.xp + amount,
      currentStreakDays: streak.currentStreakDays,
      longestStreakDays: streak.longestStreakDays,
      lastActivityDate: streak.lastActivityDate,
    },
  });

  await checkAndAwardBadges(userId);
}
