import { createHash } from "node:crypto";
import type { StudyPlanItemStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification/xp-service";
import { classifyMastery } from "@/lib/practice/readiness-service";
import { getDrillConfig } from "@/lib/practice/exam-drill-config";
import { examSlugFor } from "@/lib/exam-slugs";
import {
  resolveSubjectIds,
  allocateWeeklyMinutes,
  distributeAcrossDays,
  selectTopicsForSlot,
  dateKey,
  type SubjectAllocationInput,
  type ExamProfileInfo,
  type MasteryRow,
} from "@/lib/study-plan/scheduler";

const PROTECTED_STATUSES: StudyPlanItemStatus[] = ["COMPLETED", "IN_PROGRESS", "RESCHEDULED"];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday of the week containing `date`, date-only. JS getDay(): 0=Sunday. */
export function weekStartFor(date: Date): Date {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7; // days since Monday
  d.setDate(d.getDate() - offset);
  return d;
}

type CandidateItem = {
  date: Date;
  subjectId: string;
  topic: string;
  activityType: "LESSON" | "PRACTICE_DRILL" | "MOCK_EXAM" | "AI_COACH_SESSION" | "REVIEW_MISTAKES";
  activityReference: string | null;
  recommendedMinutes: number;
  priority: number;
  recommendationReason: string;
};

type GenerationInput = {
  weekStart: Date;
  dailyStudyMinutes: number;
  studyDays: string[];
  subjectIds: string[];
  weakSubjectIds: string[];
  examProfiles: ExamProfileInfo[];
  masteryBySubject: Map<string, MasteryRow[]>;
  coldStartTopicsBySubject: Map<string, string[]>;
  lessonRefByTopic: Map<string, string>; // "courseId|lessonId"
  examSlugBySubject: Map<string, string>;
  drillConfig: { topicDrillSize: number; practiceSessionSize: number; challengeSize: number };
  now: Date;
  fromDate?: Date;
  dayCapOverrides?: Map<string, number>;
  protectedMinutesBySubject?: Map<string, number>; // subtracted from each subject's computed allocation (regeneration only)
};

/** Pure-ish orchestration over the scheduler's pure functions — the only
 * "impure" bit is that its inputs were fetched from the database by the
 * caller, but this function itself does no I/O, so it stays unit-testable
 * in spirit even though it isn't covered by the pure-function test suite
 * directly (integration is exercised via regenerateStudyPlan in QA). */
function generateCandidateItems(input: GenerationInput): CandidateItem[] {
  const subjects: SubjectAllocationInput[] = input.subjectIds.map((id) => ({
    subjectId: id,
    isWeakSubject: input.weakSubjectIds.includes(id),
    topics: input.masteryBySubject.get(id) ?? [],
  }));

  const weeklyBudget = input.dailyStudyMinutes * input.studyDays.length;
  const baseAllocation = allocateWeeklyMinutes(subjects, input.examProfiles, weeklyBudget, input.now);

  const allocation = input.protectedMinutesBySubject
    ? new Map(
        [...baseAllocation.entries()].map(([id, minutes]) => [
          id,
          Math.max(0, minutes - (input.protectedMinutesBySubject!.get(id) ?? 0)),
        ])
      )
    : baseAllocation;

  const slots = distributeAcrossDays(
    allocation,
    input.studyDays as never,
    input.dailyStudyMinutes,
    input.weekStart,
    { fromDate: input.fromDate, dayCapOverrides: input.dayCapOverrides }
  );

  // Which day each subject last appears on, for cold-start's "seed a drill
  // on the final scheduled day" rule.
  const lastDayBySubject = new Map<string, number>();
  for (const s of slots) {
    const t = s.date.getTime();
    if (!lastDayBySubject.has(s.subjectId) || t > lastDayBySubject.get(s.subjectId)!) {
      lastDayBySubject.set(s.subjectId, t);
    }
  }

  const items: CandidateItem[] = [];
  for (const slot of slots) {
    const topics = input.masteryBySubject.get(slot.subjectId) ?? [];
    const coldStartTopics = topics.length === 0 ? input.coldStartTopicsBySubject.get(slot.subjectId) ?? [] : [];
    const daysToExamList = input.examProfiles
      .filter((e) => e.subjectIds.includes(slot.subjectId) && e.examDate)
      .map((e) => Math.round(((e.examDate as Date).getTime() - input.now.getTime()) / (24 * 60 * 60 * 1000)));
    const daysToExam = daysToExamList.length > 0 ? Math.min(...daysToExamList) : null;
    const isColdStartFinalDay = topics.length === 0 && slot.date.getTime() === lastDayBySubject.get(slot.subjectId);

    const selections = selectTopicsForSlot({
      subjectId: slot.subjectId,
      minutes: slot.minutes,
      topics,
      coldStartTopics,
      isColdStartFinalDay,
      daysToExam,
      drillConfig: input.drillConfig,
      now: input.now,
    });

    for (const sel of selections) {
      const lessonKey = `${slot.subjectId}::${sel.topic}`;
      const activityReference =
        sel.activityType === "LESSON"
          ? input.lessonRefByTopic.get(lessonKey) ?? null
          : sel.activityType === "PRACTICE_DRILL" || sel.activityType === "MOCK_EXAM" || sel.activityType === "REVIEW_MISTAKES"
            ? input.examSlugBySubject.get(slot.subjectId) ?? null
            : null;
      items.push({
        date: slot.date,
        subjectId: slot.subjectId,
        topic: sel.topic,
        activityType: sel.activityType,
        activityReference,
        recommendedMinutes: sel.minutes,
        priority: sel.masteryScore !== null ? 100 - sel.masteryScore : 50,
        recommendationReason: sel.recommendationReason,
      });
    }
  }

  return items;
}

/** Coarse, banded fingerprint of everything that should trigger a
 * recompute — deliberately excludes raw continuous scores so ordinary
 * score wobble from one more practice question doesn't force a rebuild
 * every time. */
async function computeInputFingerprint(userId: string, subjectIds: string[]): Promise<string> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      dailyStudyMinutes: true,
      studyDays: true,
      preferredStudyPeriod: true,
      targetExams: true,
      weakSubjects: { select: { id: true } },
    },
  });
  if (!profile) return "no-profile";

  const examProfiles = await prisma.studentExamProfile.findMany({
    where: { userId, exam: { in: profile.targetExams } },
    select: { exam: true, examDate: true },
  });

  const masteryRows =
    subjectIds.length > 0
      ? await prisma.studentTopicMastery.groupBy({
          by: ["subjectId"],
          where: { userId, subjectId: { in: subjectIds } },
          _avg: { masteryScore: true, confidenceScore: true },
        })
      : [];

  const subjectBands = masteryRows
    .map((r) => ({
      subjectId: r.subjectId,
      band: classifyMastery(r._avg.masteryScore ?? 0, r._avg.confidenceScore ?? 0),
    }))
    .sort((a, b) => a.subjectId.localeCompare(b.subjectId));

  const payload = JSON.stringify({
    dailyStudyMinutes: profile.dailyStudyMinutes,
    studyDays: [...profile.studyDays].sort(),
    preferredStudyPeriod: profile.preferredStudyPeriod,
    subjectIds: [...subjectIds].sort(),
    weakSubjectIds: profile.weakSubjects.map((s) => s.id).sort(),
    examDates: examProfiles.map((e) => ({ exam: e.exam, date: e.examDate?.toISOString() ?? null })).sort((a, b) => a.exam.localeCompare(b.exam)),
    subjectBands,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export type RegenerateResult =
  | { changed: false; reason: "NO_PLAN_POSSIBLE" }
  | { changed: false; itemsUnchanged: number; planId: string }
  | { changed: true; planId: string; itemsAdded: number; itemsUpdated: number; itemsUnchanged: number; missedCount: number };

/** The single entry point every trigger event (brief §9) calls. Cheap when
 * nothing meaningful changed (fingerprint match, `!force`); otherwise
 * flips past PENDING items to MISSED, protects COMPLETED/IN_PROGRESS/
 * RESCHEDULED/isCustom items and their minutes from the recompute, and
 * diffs the freshly-generated remainder against existing future PENDING
 * rows — inserting/updating/deleting only what actually changed, inside
 * one transaction. */
export async function regenerateStudyPlan(
  userId: string,
  options: { reason: string; force?: boolean; now?: Date }
): Promise<RegenerateResult> {
  const now = options.now ?? new Date();
  const weekStart = weekStartFor(now);

  const [profile, examProfilesRaw] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        dailyStudyMinutes: true,
        studyDays: true,
        targetExams: true,
        targetSubjects: { select: { id: true } },
        weakSubjects: { select: { id: true } },
      },
    }),
    prisma.studentExamProfile.findMany({
      where: { userId },
      select: { exam: true, subjects: { select: { id: true } }, examDate: true },
    }),
  ]);

  if (!profile || !profile.dailyStudyMinutes || profile.studyDays.length === 0) {
    return { changed: false, reason: "NO_PLAN_POSSIBLE" };
  }

  const targetExamProfiles = examProfilesRaw.filter((e) => profile.targetExams.includes(e.exam));
  const examProfileSubjectIds = [...new Set(targetExamProfiles.flatMap((e) => e.subjects.map((s) => s.id)))];

  const subjectIds = resolveSubjectIds({
    targetSubjectIds: profile.targetSubjects.map((s) => s.id),
    examProfileSubjectIds,
    weakSubjectIds: profile.weakSubjects.map((s) => s.id),
  });
  if (subjectIds.length === 0) {
    return { changed: false, reason: "NO_PLAN_POSSIBLE" };
  }

  const fingerprint = await computeInputFingerprint(userId, subjectIds);

  const existingPlan = await prisma.studyPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    include: { items: true },
  });

  // Bookkeeping pass: past-dated PENDING items always flip to MISSED,
  // independent of the fingerprint check below — this must never be
  // skipped, or a quiet day (no other trigger event) would leave
  // yesterday's unfinished items sitting as PENDING forever instead of
  // MISSED, breaking the "welcome back, you missed N activities"
  // experience (Today's Study depends on this running every time this
  // function is called, including the cheap/no-op path).
  const today = startOfDay(now);
  const missedIds = (existingPlan?.items ?? [])
    .filter((i) => i.status === "PENDING" && startOfDay(i.date) < today)
    .map((i) => i.id);
  if (missedIds.length > 0) {
    await prisma.studyPlanItem.updateMany({ where: { id: { in: missedIds } }, data: { status: "MISSED" } });
  }

  if (existingPlan && !options.force && existingPlan.inputFingerprint === fingerprint) {
    return {
      changed: false,
      itemsUnchanged: existingPlan.items.length - missedIds.length,
      planId: existingPlan.id,
    };
  }

  const protectedItems = (existingPlan?.items ?? []).filter(
    (i) => i.isCustom || PROTECTED_STATUSES.includes(i.status)
  );
  const mutableItems = (existingPlan?.items ?? []).filter(
    (i) => !i.isCustom && i.status === "PENDING" && startOfDay(i.date) >= today
  );

  const [masteryRowsRaw, drillConfig, lessons] = await Promise.all([
    prisma.studentTopicMastery.findMany({
      where: { userId, subjectId: { in: subjectIds } },
      select: { subjectId: true, topic: true, masteryScore: true, confidenceScore: true, lastPracticedAt: true },
    }),
    getDrillConfig(profile.targetExams[0] ?? "WAEC"),
    prisma.lesson.findMany({
      where: {
        topic: { not: null },
        moderationStatus: "PUBLISHED",
        module: { course: { published: true, subjectId: { in: subjectIds } } },
      },
      select: {
        id: true,
        topic: true,
        order: true,
        module: { select: { order: true, courseId: true, course: { select: { subjectId: true } } } },
      },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    }),
  ]);

  const masteryBySubject = new Map<string, MasteryRow[]>();
  for (const r of masteryRowsRaw) {
    const list = masteryBySubject.get(r.subjectId) ?? [];
    list.push(r);
    masteryBySubject.set(r.subjectId, list);
  }

  const coldStartTopicsBySubject = new Map<string, string[]>();
  const lessonRefByTopic = new Map<string, string>();
  for (const l of lessons) {
    const subjectId = l.module.course.subjectId;
    if (!subjectId || !l.topic) continue;
    const key = `${subjectId}::${l.topic}`;
    if (!lessonRefByTopic.has(key)) lessonRefByTopic.set(key, `${l.module.courseId}|${l.id}`);
    const list = coldStartTopicsBySubject.get(subjectId) ?? [];
    if (!list.includes(l.topic)) list.push(l.topic);
    coldStartTopicsBySubject.set(subjectId, list);
  }

  const examProfileInfos: ExamProfileInfo[] = targetExamProfiles.map((e) => ({
    subjectIds: e.subjects.map((s) => s.id),
    examDate: e.examDate,
  }));

  // Best exam slug to link a drill/mock/review item into — prefer an exam
  // whose StudentExamProfile explicitly includes this subject, falling
  // back to the student's first target exam so the link is never dead.
  const examSlugBySubject = new Map<string, string>();
  for (const id of subjectIds) {
    const specific = targetExamProfiles.find((e) => e.subjects.some((s) => s.id === id));
    const exam = specific?.exam ?? profile.targetExams[0];
    if (exam) examSlugBySubject.set(id, examSlugFor(exam));
  }

  // Protected minutes already spoken for, per subject and per day, so the
  // recompute never double-books a slot that's already completed/in
  // progress/custom.
  const protectedMinutesBySubject = new Map<string, number>();
  const protectedMinutesByDay = new Map<string, number>();
  for (const item of protectedItems) {
    protectedMinutesBySubject.set(
      item.subjectId,
      (protectedMinutesBySubject.get(item.subjectId) ?? 0) + item.recommendedMinutes
    );
    const key = dateKey(item.date);
    protectedMinutesByDay.set(key, (protectedMinutesByDay.get(key) ?? 0) + item.recommendedMinutes);
  }

  const dayCapOverrides =
    protectedMinutesByDay.size > 0
      ? new Map(
          [...protectedMinutesByDay.entries()].map(([key, minutes]) => [key, Math.max(0, profile.dailyStudyMinutes! - minutes)])
        )
      : undefined;

  const candidateItems = generateCandidateItems({
    weekStart,
    dailyStudyMinutes: profile.dailyStudyMinutes,
    studyDays: profile.studyDays,
    subjectIds,
    weakSubjectIds: profile.weakSubjects.map((s) => s.id),
    examProfiles: examProfileInfos,
    masteryBySubject,
    coldStartTopicsBySubject,
    lessonRefByTopic,
    examSlugBySubject,
    drillConfig,
    now,
    fromDate: existingPlan ? today : undefined,
    dayCapOverrides,
    protectedMinutesBySubject: protectedMinutesBySubject.size > 0 ? protectedMinutesBySubject : undefined,
  });

  // Subject mastery snapshot for next week's summary delta — real data
  // only, one average per subject with at least one confidently-tracked
  // topic.
  const subjectMasterySnapshot: Record<string, number> = {};
  for (const [subjectId, rows] of masteryBySubject) {
    const confident = rows.filter((r) => r.confidenceScore > 0.15);
    if (confident.length === 0) continue;
    subjectMasterySnapshot[subjectId] = Math.round(
      confident.reduce((sum, r) => sum + r.masteryScore, 0) / confident.length
    );
  }

  const naturalKey = (i: { date: Date; subjectId: string; topic: string; activityType: string }) =>
    `${dateKey(i.date)}::${i.subjectId}::${i.topic}::${i.activityType}`;

  const mutableByKey = new Map(mutableItems.map((i) => [naturalKey(i), i]));
  const candidateByKey = new Map(candidateItems.map((i) => [naturalKey(i), i]));

  let itemsAdded = 0;
  let itemsUpdated = 0;
  let itemsUnchanged = 0;

  const planId = await prisma.$transaction(async (tx) => {
    const plan = await tx.studyPlan.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: {
        status: "ACTIVE",
        lastRegeneratedAt: now,
        regenerationReason: options.reason,
        inputFingerprint: fingerprint,
        subjectMasterySnapshot,
      },
      create: {
        userId,
        weekStart,
        generatedAt: now,
        lastRegeneratedAt: now,
        regenerationReason: options.reason,
        inputFingerprint: fingerprint,
        subjectMasterySnapshot,
      },
    });

    for (const [key, candidate] of candidateByKey) {
      const existing = mutableByKey.get(key);
      if (!existing) {
        try {
          await tx.studyPlanItem.create({
            data: {
              studyPlanId: plan.id,
              date: candidate.date,
              subjectId: candidate.subjectId,
              topic: candidate.topic,
              activityType: candidate.activityType,
              activityReference: candidate.activityReference,
              recommendedMinutes: candidate.recommendedMinutes,
              priority: candidate.priority,
              recommendationReason: candidate.recommendationReason,
              order: itemsAdded + itemsUpdated,
            },
          });
          itemsAdded++;
        } catch (error) {
          // Race with another concurrent regeneration landing the same
          // natural key first — safe no-op, matches awardXp's own P2002
          // handling pattern.
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
          itemsUnchanged++;
        }
      } else if (
        existing.recommendedMinutes !== candidate.recommendedMinutes ||
        existing.priority !== candidate.priority ||
        existing.recommendationReason !== candidate.recommendationReason ||
        existing.activityReference !== candidate.activityReference
      ) {
        await tx.studyPlanItem.update({
          where: { id: existing.id },
          data: {
            recommendedMinutes: candidate.recommendedMinutes,
            priority: candidate.priority,
            recommendationReason: candidate.recommendationReason,
            activityReference: candidate.activityReference,
          },
        });
        itemsUpdated++;
      } else {
        itemsUnchanged++;
      }
    }

    const staleIds = [...mutableByKey.entries()].filter(([key]) => !candidateByKey.has(key)).map(([, i]) => i.id);
    if (staleIds.length > 0) {
      await tx.studyPlanItem.deleteMany({ where: { id: { in: staleIds } } });
    }

    return plan.id;
  });

  return { changed: true, planId, itemsAdded, itemsUpdated, itemsUnchanged, missedCount: missedIds.length };
}

/** Marks a plan item complete, awards XP idempotently (reusing awardXp's
 * existing [userId, type, sourceId] pattern), and only schedules a full
 * regenerate when the touched topic's mastery band actually changed or its
 * score moved meaningfully — cheap on the common path. */
export async function recordActivityCompletion(userId: string, studyPlanItemId: string): Promise<void> {
  const item = await prisma.studyPlanItem.findUnique({
    where: { id: studyPlanItemId },
    include: { studyPlan: { select: { userId: true } } },
  });
  if (!item || item.studyPlan.userId !== userId) {
    throw new Error("Study plan item not found.");
  }
  if (item.status === "COMPLETED") return; // already recorded — idempotent no-op

  const before = await prisma.studentTopicMastery.findUnique({
    where: { userId_subjectId_topic: { userId, subjectId: item.subjectId, topic: item.topic } },
    select: { masteryScore: true, confidenceScore: true },
  });

  await prisma.studyPlanItem.update({
    where: { id: studyPlanItemId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await awardXp(userId, "STUDY_PLAN_ITEM_COMPLETE", studyPlanItemId);

  const after = await prisma.studentTopicMastery.findUnique({
    where: { userId_subjectId_topic: { userId, subjectId: item.subjectId, topic: item.topic } },
    select: { masteryScore: true, confidenceScore: true },
  });

  const beforeBand = before ? classifyMastery(before.masteryScore, before.confidenceScore) : null;
  const afterBand = after ? classifyMastery(after.masteryScore, after.confidenceScore) : null;
  const scoreMoved = before && after ? Math.abs(after.masteryScore - before.masteryScore) > 15 : false;

  if (beforeBand !== afterBand || scoreMoved) {
    await regenerateStudyPlan(userId, { reason: "SIGNIFICANT_PERFORMANCE_CHANGE" });
  }
}

/** Best-effort bridge from "the student did the real activity" (finished a
 * lesson, submitted a drill/mock) to "the matching plan item, if any, gets
 * marked complete too" — so a student who works from the real content
 * pages rather than clicking "Mark Complete" on /study-plan still keeps
 * their plan in sync. A student doing work outside any scheduled item is
 * completely normal and this is simply a no-op in that case. */
export async function recordLessonActivityCompletion(userId: string, lessonId: string): Promise<void> {
  const item = await prisma.studyPlanItem.findFirst({
    where: {
      activityType: "LESSON",
      activityReference: lessonId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      studyPlan: { userId },
    },
    orderBy: { date: "asc" },
  });
  if (item) await recordActivityCompletion(userId, item.id);
}

export async function recordDrillActivityCompletion(userId: string, subjectIds: string[]): Promise<void> {
  if (subjectIds.length === 0) return;
  const item = await prisma.studyPlanItem.findFirst({
    where: {
      activityType: { in: ["PRACTICE_DRILL", "MOCK_EXAM", "REVIEW_MISTAKES"] },
      subjectId: { in: subjectIds },
      status: { in: ["PENDING", "IN_PROGRESS"] },
      studyPlan: { userId },
      date: { lte: new Date() },
    },
    orderBy: { date: "asc" },
  });
  if (item) await recordActivityCompletion(userId, item.id);
}

export type MissedItemAction = "DO_TODAY" | "MOVE_TOMORROW" | "SKIP" | { type: "RESCHEDULE"; date: Date };

/** A single targeted status/date update — never a full regenerate. Powers
 * the non-punitive "You missed this study session" UI. */
export async function resolveMissedItem(userId: string, itemId: string, action: MissedItemAction): Promise<void> {
  const item = await prisma.studyPlanItem.findUnique({
    where: { id: itemId },
    include: { studyPlan: { select: { userId: true } } },
  });
  if (!item || item.studyPlan.userId !== userId) {
    throw new Error("Study plan item not found.");
  }

  if (action === "SKIP") {
    await prisma.studyPlanItem.update({ where: { id: itemId }, data: { status: "SKIPPED" } });
    return;
  }
  if (action === "DO_TODAY") {
    await prisma.studyPlanItem.update({
      where: { id: itemId },
      data: { date: startOfDay(new Date()), status: "PENDING" },
    });
    return;
  }
  if (action === "MOVE_TOMORROW") {
    const tomorrow = new Date(startOfDay(new Date()));
    tomorrow.setDate(tomorrow.getDate() + 1);
    await prisma.studyPlanItem.update({ where: { id: itemId }, data: { date: tomorrow, status: "RESCHEDULED" } });
    return;
  }
  await prisma.studyPlanItem.update({
    where: { id: itemId },
    data: { date: startOfDay(action.date), status: "RESCHEDULED" },
  });
}

/** Generic reschedule for any (not just missed) item — brief §13's "move
 * activities". Same single-row-update contract as resolveMissedItem. */
export async function rescheduleItem(userId: string, itemId: string, newDate: Date): Promise<void> {
  const item = await prisma.studyPlanItem.findUnique({
    where: { id: itemId },
    include: { studyPlan: { select: { userId: true } } },
  });
  if (!item || item.studyPlan.userId !== userId) {
    throw new Error("Study plan item not found.");
  }
  await prisma.studyPlanItem.update({
    where: { id: itemId },
    data: { date: startOfDay(newDate), status: "RESCHEDULED" },
  });
}

export async function saveStudyPreferences(
  userId: string,
  prefs: { dailyStudyMinutes: number; studyDays: string[]; preferredStudyPeriod: string | null }
): Promise<void> {
  await prisma.studentProfile.update({
    where: { userId },
    data: {
      dailyStudyMinutes: prefs.dailyStudyMinutes,
      studyDays: { set: prefs.studyDays as never },
      preferredStudyPeriod: prefs.preferredStudyPeriod as never,
    },
  });
  await regenerateStudyPlan(userId, { reason: "PROFILE_CHANGED" });
}

export async function updateStudyPlanSubjects(userId: string, subjectIds: string[]): Promise<void> {
  await prisma.studentProfile.update({
    where: { userId },
    data: { targetSubjects: { set: subjectIds.map((id) => ({ id })) } },
  });
  await regenerateStudyPlan(userId, { reason: "PROFILE_CHANGED" });
}

/** A student-added personal session — always protected from regeneration
 * (isCustom: true), same protection COMPLETED/IN_PROGRESS items get. */
export async function addCustomSession(
  userId: string,
  input: { subjectId: string; topic: string; minutes: number; date: Date }
): Promise<void> {
  const now = new Date();
  const weekStart = weekStartFor(input.date);
  const plan = await prisma.studyPlan.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {},
    create: {
      userId,
      weekStart,
      generatedAt: now,
      lastRegeneratedAt: now,
      regenerationReason: "MANUAL",
      inputFingerprint: "custom-session-only",
    },
  });

  await prisma.studyPlanItem.upsert({
    where: {
      studyPlanId_date_subjectId_topic_activityType: {
        studyPlanId: plan.id,
        date: startOfDay(input.date),
        subjectId: input.subjectId,
        topic: input.topic,
        activityType: "PRACTICE_DRILL",
      },
    },
    update: { recommendedMinutes: input.minutes, isCustom: true },
    create: {
      studyPlanId: plan.id,
      date: startOfDay(input.date),
      subjectId: input.subjectId,
      topic: input.topic,
      activityType: "PRACTICE_DRILL",
      recommendedMinutes: input.minutes,
      recommendationReason: "Added by you.",
      isCustom: true,
    },
  });
}
