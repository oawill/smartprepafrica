import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

type BadgeCheckStats = {
  lessonCompletions: number;
  courseCompletions: number;
  examAttempts: number;
  discussionReplies: number;
  longestStreakDays: number;
};

/** A small, fixed, code-defined catalog — no admin CMS this phase (see
 * the plan's rationale: same "ship the real, narrow thing" scoping used
 * for the Prep↔Learning crossover and Discussions phases). Order here is
 * also display order on the badges page. */
export const BADGE_CATALOG: {
  name: string;
  description: string;
  check: (stats: BadgeCheckStats) => boolean;
}[] = [
  { name: "First Steps", description: "Complete your first lesson.", check: (s) => s.lessonCompletions >= 1 },
  { name: "Course Graduate", description: "Complete your first course.", check: (s) => s.courseCompletions >= 1 },
  { name: "On a Roll", description: "Reach a 7-day study streak.", check: (s) => s.longestStreakDays >= 7 },
  { name: "Marathon Learner", description: "Reach a 30-day study streak.", check: (s) => s.longestStreakDays >= 30 },
  { name: "Practice Makes Perfect", description: "Submit 10 practice attempts.", check: (s) => s.examAttempts >= 10 },
  { name: "Community Helper", description: "Post 5 discussion replies.", check: (s) => s.discussionReplies >= 5 },
];

/** Checks every catalog entry against this student's current stats and
 * awards (via upsert, so re-checking an already-held badge is a no-op —
 * the existing @@unique([userId, badgeId]) does the deduping) any that
 * newly qualify. Only sends a notification for a genuinely new award. */
export async function checkAndAwardBadges(userId: string): Promise<void> {
  const [eventCounts, profile, existingBadgeNames] = await Promise.all([
    prisma.xpEvent.groupBy({ by: ["type"], where: { userId }, _count: { _all: true } }),
    prisma.studentProfile.findUnique({ where: { userId }, select: { longestStreakDays: true } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badge: { select: { name: true } } } }),
  ]);
  if (!profile) return;

  const countOf = (type: string) => eventCounts.find((e) => e.type === type)?._count._all ?? 0;
  const stats: BadgeCheckStats = {
    lessonCompletions: countOf("LESSON_COMPLETE"),
    courseCompletions: countOf("COURSE_COMPLETE"),
    examAttempts: countOf("EXAM_ATTEMPT"),
    discussionReplies: countOf("DISCUSSION_REPLY"),
    longestStreakDays: profile.longestStreakDays,
  };

  const alreadyHeld = new Set(existingBadgeNames.map((b) => b.badge.name));

  for (const entry of BADGE_CATALOG) {
    if (alreadyHeld.has(entry.name) || !entry.check(stats)) continue;

    const badge = await prisma.badge.upsert({
      where: { name: entry.name },
      update: {},
      create: { name: entry.name, description: entry.description },
    });

    try {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }

    await notifyUser(userId, "BADGE_EARNED", `You earned the "${entry.name}" badge!`, "/dashboard/student/badges");
  }
}
