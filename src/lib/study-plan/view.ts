import type { StudyActivityType, StudyPlanItemStatus, StudyPlanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/study-plan/scheduler";
import { startOfDay, weekStartFor } from "@/lib/study-plan/regenerate";

export type StudyPlanViewItem = {
  id: string;
  date: Date;
  subjectId: string;
  subjectName: string;
  topic: string;
  activityType: StudyActivityType;
  recommendedMinutes: number;
  status: StudyPlanItemStatus;
  recommendationReason: string;
  isCustom: boolean;
  href: string | null;
};

export type StudyPlanView = {
  planId: string;
  status: StudyPlanStatus;
  weekStart: Date;
  items: StudyPlanViewItem[];
  itemsByDate: Map<string, StudyPlanViewItem[]>;
  totalPlannedMinutes: number;
  completedMinutes: number;
  weeklyCompletionPct: number;
};

/** Resolves a plan item into a real, existing route — never a dead link.
 * LESSON stores "courseId|lessonId"; drill/review/mock items store an
 * exam slug; AI_COACH_SESSION has no href (rendered as a "Study With AI
 * Coach" button instead, which needs no deep link at all). */
export function studyPlanItemHref(item: { activityType: StudyActivityType; activityReference: string | null }): string | null {
  if (!item.activityReference) return null;
  if (item.activityType === "LESSON") {
    const [courseId, lessonId] = item.activityReference.split("|");
    return courseId && lessonId ? `/learn/${courseId}/lessons/${lessonId}` : null;
  }
  if (item.activityType === "PRACTICE_DRILL" || item.activityType === "REVIEW_MISTAKES") {
    return `/practice/${item.activityReference}/drills`;
  }
  if (item.activityType === "MOCK_EXAM") {
    return `/practice/${item.activityReference}`;
  }
  return null;
}

export const ACTIVITY_TYPE_LABELS: Record<StudyActivityType, string> = {
  LESSON: "Lesson",
  PRACTICE_DRILL: "Practice Drill",
  MOCK_EXAM: "Mock Exam",
  AI_COACH_SESSION: "AI Coach Session",
  REVIEW_MISTAKES: "Review Mistakes",
};

export async function getStudyPlanView(userId: string, weekStart: Date): Promise<StudyPlanView | null> {
  const plan = await prisma.studyPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    include: {
      items: {
        include: { subject: { select: { name: true } } },
        orderBy: [{ date: "asc" }, { order: "asc" }],
      },
    },
  });
  if (!plan) return null;

  const items: StudyPlanViewItem[] = plan.items.map((i) => ({
    id: i.id,
    date: i.date,
    subjectId: i.subjectId,
    subjectName: i.subject.name,
    topic: i.topic,
    activityType: i.activityType,
    recommendedMinutes: i.recommendedMinutes,
    status: i.status,
    recommendationReason: i.recommendationReason,
    isCustom: i.isCustom,
    href: studyPlanItemHref(i),
  }));

  const itemsByDate = new Map<string, StudyPlanViewItem[]>();
  for (const item of items) {
    const key = dateKey(item.date);
    const list = itemsByDate.get(key) ?? [];
    list.push(item);
    itemsByDate.set(key, list);
  }

  const totalPlannedMinutes = items.reduce((sum, i) => sum + i.recommendedMinutes, 0);
  const completedMinutes = items.filter((i) => i.status === "COMPLETED").reduce((sum, i) => sum + i.recommendedMinutes, 0);
  const weeklyCompletionPct =
    items.length > 0 ? Math.round((items.filter((i) => i.status === "COMPLETED").length / items.length) * 100) : 0;

  return {
    planId: plan.id,
    status: plan.status,
    weekStart: plan.weekStart,
    items,
    itemsByDate,
    totalPlannedMinutes,
    completedMinutes,
    weeklyCompletionPct,
  };
}

export function getTodayItems(view: StudyPlanView, now: Date = new Date()): StudyPlanViewItem[] {
  return view.itemsByDate.get(dateKey(startOfDay(now))) ?? [];
}

export function getNextActivity(view: StudyPlanView, now: Date = new Date()): StudyPlanViewItem | null {
  const today = startOfDay(now);
  const upcoming = view.items
    .filter((i) => i.status === "PENDING" && startOfDay(i.date) >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return upcoming[0] ?? null;
}

export function getMissedItems(view: StudyPlanView): StudyPlanViewItem[] {
  return view.items.filter((i) => i.status === "MISSED");
}

export { weekStartFor };
