import type { StudyActivityType, StudyDayOfWeek } from "@prisma/client";
import { classifyMastery, type TopicStatus } from "@/lib/practice/readiness-service";

/** Every function here is pure — no Prisma, no Date.now() side effects
 * beyond an explicit `now` parameter — so the allocation/selection logic
 * can be unit-tested deterministically and reused by both the initial
 * generation path and regeneration's recompute-the-remainder path. */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const SESSION_UNIT_MINUTES = 30;
export const MIN_USEFUL_CHUNK_MINUTES = 10;
export const DEFAULT_LESSON_MINUTES = 20;
export const DEFAULT_AI_COACH_MINUTES = 20;
export const AVG_SECONDS_PER_DRILL_ITEM = 90;

export function round5(minutes: number): number {
  return Math.max(0, Math.round(minutes / 5) * 5);
}

/** How much weight a mastery band carries in both the subject-level and
 * topic-level priority formulas — the one place "how bad is weak" is
 * tuned. NOT_ENOUGH_DATA sits slightly above neutral so a totally
 * untracked subject/topic still gets a fair share rather than being
 * starved by subjects that merely look weak on paper. */
const BAND_WEIGHT: Record<TopicStatus, number> = {
  WEAK: 1.0,
  REVIEW: 0.75,
  IMPROVING: 0.5,
  STRONG: 0.25,
  NOT_ENOUGH_DATA: 0.6,
};

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// ---------- Subject set resolution (brief §22 cold-start fallback chain) ----------

export function resolveSubjectIds(params: {
  targetSubjectIds: string[];
  examProfileSubjectIds: string[];
  weakSubjectIds: string[];
}): string[] {
  if (params.targetSubjectIds.length > 0) return [...new Set(params.targetSubjectIds)];
  if (params.examProfileSubjectIds.length > 0) return [...new Set(params.examProfileSubjectIds)];
  if (params.weakSubjectIds.length > 0) return [...new Set(params.weakSubjectIds)];
  return [];
}

// ---------- Weekly minute allocation across subjects ----------

export type MasteryRow = {
  subjectId: string;
  topic: string;
  masteryScore: number;
  confidenceScore: number;
  lastPracticedAt: Date | null;
};

export type ExamProfileInfo = {
  subjectIds: string[];
  examDate: Date | null;
};

export type SubjectAllocationInput = {
  subjectId: string;
  isWeakSubject: boolean;
  topics: MasteryRow[]; // this subject's own topic rows only
};

function weaknessScore(input: SubjectAllocationInput): number {
  const base =
    input.topics.length === 0
      ? BAND_WEIGHT.NOT_ENOUGH_DATA
      : input.topics.reduce((sum, t) => sum + BAND_WEIGHT[classifyMastery(t.masteryScore, t.confidenceScore)], 0) /
        input.topics.length;
  return Math.min(1, base + (input.isWeakSubject ? 0.15 : 0));
}

function examImportanceScore(subjectId: string, examProfiles: ExamProfileInfo[]): number {
  if (examProfiles.length === 0) return 0;
  const matching = examProfiles.filter((e) => e.subjectIds.includes(subjectId)).length;
  return matching / examProfiles.length;
}

function examUrgencyScore(subjectId: string, examProfiles: ExamProfileInfo[], now: Date): number {
  const daysRemainingList = examProfiles
    .filter((e) => e.subjectIds.includes(subjectId) && e.examDate)
    .map((e) => daysBetween(now, e.examDate as Date));
  if (daysRemainingList.length === 0) return 0.2;
  const days = Math.min(...daysRemainingList);
  if (days > 60) return 0.2;
  if (days >= 31) return 0.4;
  if (days >= 15) return 0.6;
  if (days >= 8) return 0.8;
  return 1.0;
}

function stalenessScore(input: SubjectAllocationInput, now: Date): number {
  const practiced = input.topics.map((t) => t.lastPracticedAt).filter((d): d is Date => d !== null);
  if (practiced.length === 0) return 1.0;
  const mostRecent = new Date(Math.max(...practiced.map((d) => d.getTime())));
  const daysSince = daysBetween(mostRecent, now);
  if (daysSince >= 14) return 0.9;
  if (daysSince >= 7) return 0.6;
  if (daysSince >= 3) return 0.3;
  return 0.1;
}

/** 0.40*weakness + 0.20*examImportance + 0.25*examUrgency + 0.15*staleness —
 * the single formula behind "prioritize weak subjects, exam importance,
 * time remaining, and staleness" without ever giving every subject an
 * equal share. */
export function computeSubjectScore(
  input: SubjectAllocationInput,
  examProfiles: ExamProfileInfo[],
  now: Date = new Date()
): number {
  return (
    0.4 * weaknessScore(input) +
    0.2 * examImportanceScore(input.subjectId, examProfiles) +
    0.25 * examUrgencyScore(input.subjectId, examProfiles, now) +
    0.15 * stalenessScore(input, now)
  );
}

/** Splits weeklyBudget across subjects proportional to computeSubjectScore,
 * in 5-minute units, with a floor (no subject vanishes) and a cap (no
 * subject monopolizes the week when there's more than one). The result
 * always sums to exactly weeklyBudget (largest-remainder rounding), which
 * is the "never exceeds the student's selected study time" guarantee. */
export function allocateWeeklyMinutes(
  subjects: SubjectAllocationInput[],
  examProfiles: ExamProfileInfo[],
  weeklyBudget: number,
  now: Date = new Date()
): Map<string, number> {
  const allocation = new Map<string, number>();
  if (subjects.length === 0 || weeklyBudget <= 0) return allocation;

  const scores = subjects.map((s) => ({
    subjectId: s.subjectId,
    score: Math.max(0.01, computeSubjectScore(s, examProfiles, now)),
  }));
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

  const minFloor = Math.min(30, round5(weeklyBudget / (subjects.length * 3)));
  const maxCap = subjects.length >= 2 ? 0.5 * weeklyBudget : weeklyBudget;

  const raw = scores.map((s) => ({
    subjectId: s.subjectId,
    minutes: Math.min(maxCap, Math.max(minFloor, round5((s.score / totalScore) * weeklyBudget))),
    score: s.score,
  }));

  const allocated = raw.reduce((sum, r) => sum + r.minutes, 0);
  let remainder = weeklyBudget - allocated;

  // Distribute the rounding remainder in 5-minute steps, highest-score
  // subject first (ties broken by subjectId), so the total always lands
  // exactly on weeklyBudget rather than drifting from rounding.
  const order = [...raw].sort((a, b) => b.score - a.score || a.subjectId.localeCompare(b.subjectId));
  let i = 0;
  while (remainder !== 0 && order.length > 0) {
    const entry = order[i % order.length];
    if (remainder > 0) {
      entry.minutes += 5;
      remainder -= 5;
    } else if (entry.minutes >= minFloor + 5) {
      entry.minutes -= 5;
      remainder += 5;
    }
    i++;
    if (i > order.length * 200) break; // safety valve, never loops forever
  }

  for (const r of raw) allocation.set(r.subjectId, Math.max(0, r.minutes));
  return allocation;
}

// ---------- Distributing weekly allocations across the student's study days ----------

export type DaySlot = { date: Date; subjectId: string; minutes: number };

const DAY_ORDER: StudyDayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** weekStart must be the Monday of the target week (date-only). Returns
 * one entry per (day, subject, minutes) chunk — deterministic round-robin
 * bin-packing so the same inputs always produce the same week, never
 * exceeding dailyStudyMinutes (or a per-day override) on any day or the
 * subject's total allocation across the week.
 *
 * `fromDate` restricts output to days on/after it (used by regeneration to
 * recompute only the remaining, not-yet-past days of a week already in
 * progress) — day indices are still computed relative to `weekStart`, so
 * mid-week regeneration keeps the same calendar mapping.
 *
 * `dayCapOverrides` (keyed by `dateKey`) lets a day whose budget is
 * already partly spent on protected (completed/in-progress/custom) items
 * use a reduced cap instead of the full `dailyStudyMinutes`. */
export function distributeAcrossDays(
  allocations: Map<string, number>,
  studyDays: StudyDayOfWeek[],
  dailyStudyMinutes: number,
  weekStart: Date,
  options?: { fromDate?: Date; dayCapOverrides?: Map<string, number> }
): DaySlot[] {
  if (dailyStudyMinutes <= 0 || studyDays.length === 0) return [];

  const orderedDays = DAY_ORDER.filter((d) => studyDays.includes(d));
  const remaining = new Map(allocations);
  let queue = [...remaining.keys()].filter((id) => (remaining.get(id) ?? 0) > 0);
  queue.sort((a, b) => (remaining.get(b) ?? 0) - (remaining.get(a) ?? 0) || a.localeCompare(b));

  const slots: DaySlot[] = [];

  for (const dayName of orderedDays) {
    const dayIndex = DAY_ORDER.indexOf(dayName);
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayIndex);

    if (options?.fromDate && date < options.fromDate) continue;

    let dayRemaining = options?.dayCapOverrides?.get(dateKey(date)) ?? dailyStudyMinutes;
    const scheduledToday = new Set<string>();
    const carried: string[] = [];

    while (dayRemaining >= MIN_USEFUL_CHUNK_MINUTES && queue.length > 0) {
      const nextIndex = queue.findIndex((id) => !scheduledToday.has(id) && (remaining.get(id) ?? 0) > 0);
      const subjectId = nextIndex === -1 ? queue.find((id) => (remaining.get(id) ?? 0) > 0) : queue[nextIndex];
      if (!subjectId) break;

      const subjectRemaining = remaining.get(subjectId) ?? 0;
      const chunk = Math.min(SESSION_UNIT_MINUTES, subjectRemaining, dayRemaining);
      if (chunk < MIN_USEFUL_CHUNK_MINUTES) {
        carried.push(subjectId);
        queue = queue.filter((id) => id !== subjectId);
        continue;
      }

      slots.push({ date, subjectId, minutes: chunk });
      remaining.set(subjectId, subjectRemaining - chunk);
      dayRemaining -= chunk;
      scheduledToday.add(subjectId);

      if ((remaining.get(subjectId) ?? 0) <= 0) {
        queue = queue.filter((id) => id !== subjectId);
      }
    }

    // Rotate: subjects scheduled today move to the back so tomorrow
    // favors whoever wasn't just covered — this is what spreads subjects
    // across the week instead of clustering one on consecutive days.
    queue = [...queue.filter((id) => !scheduledToday.has(id)), ...queue.filter((id) => scheduledToday.has(id)), ...carried].filter(
      (id, idx, arr) => arr.indexOf(id) === idx && (remaining.get(id) ?? 0) > 0
    );
  }

  return slots;
}

// ---------- Topic-level selection + activity type + sizing + reason ----------

export type TopicSelection = {
  topic: string;
  activityType: StudyActivityType;
  minutes: number;
  recommendationReason: string;
  masteryScore: number | null;
};

export type DrillConfigInfo = {
  topicDrillSize: number;
  practiceSessionSize: number;
  challengeSize: number;
};

type ExamProximityBucket = "FAR" | "MID" | "NEAR" | "CLOSE" | "IMMINENT";

export function examProximityBucket(daysToExam: number | null): ExamProximityBucket {
  if (daysToExam === null || daysToExam > 60) return "FAR";
  if (daysToExam >= 31) return "MID";
  if (daysToExam >= 15) return "NEAR";
  if (daysToExam >= 8) return "CLOSE";
  return "IMMINENT";
}

function topicPriority(row: MasteryRow, now: Date): number {
  const band = classifyMastery(row.masteryScore, row.confidenceScore);
  const staleDays = row.lastPracticedAt ? daysBetween(row.lastPracticedAt, now) : Infinity;
  const staleness = staleDays >= 14 ? 1 : staleDays >= 7 ? 0.6 : staleDays >= 3 ? 0.3 : 0.1;
  const lowConfidence = row.confidenceScore <= 0.15 ? 1 : 1 - row.confidenceScore;
  return 0.5 * BAND_WEIGHT[band] + 0.3 * staleness + 0.2 * lowConfidence;
}

/** Deterministic simplification of the exam-proximity activity-mix ramp:
 * rather than a probabilistic blend, each (band, bucket) pair maps to one
 * activity type. Weak/review topics shift from drills toward review-of-
 * mistakes as the exam nears; improving/strong topics lose the option of
 * a fresh lesson once inside two weeks of the exam (forced into drills/
 * mocks instead); brand-new topics keep the lesson option at any
 * distance, since a late introduction still beats leaving a gap. */
function activityTypeFor(band: TopicStatus, bucket: ExamProximityBucket, topicIndex: number): StudyActivityType {
  if (band === "NOT_ENOUGH_DATA") return "LESSON";

  if (band === "WEAK" || band === "REVIEW") {
    if (bucket === "IMMINENT") return topicIndex % 2 === 0 ? "REVIEW_MISTAKES" : "MOCK_EXAM";
    if (bucket === "CLOSE") return topicIndex % 2 === 0 ? "REVIEW_MISTAKES" : "PRACTICE_DRILL";
    return "PRACTICE_DRILL";
  }

  if (band === "IMPROVING") {
    if (bucket === "CLOSE" || bucket === "IMMINENT") return "PRACTICE_DRILL";
    return topicIndex % 3 === 0 ? "PRACTICE_DRILL" : "LESSON";
  }

  // STRONG — light maintenance only, never a full lesson.
  if (bucket === "IMMINENT") return "MOCK_EXAM";
  return "PRACTICE_DRILL";
}

function estimateMinutes(
  activityType: StudyActivityType,
  drillConfig: DrillConfigInfo,
  bucket: ExamProximityBucket,
  lessonMinutesHint?: number
): number {
  if (activityType === "LESSON") return round5(lessonMinutesHint ?? DEFAULT_LESSON_MINUTES);
  if (activityType === "AI_COACH_SESSION") return DEFAULT_AI_COACH_MINUTES;

  const itemCount =
    activityType === "MOCK_EXAM"
      ? drillConfig.challengeSize
      : bucket === "CLOSE" || bucket === "IMMINENT"
        ? drillConfig.practiceSessionSize
        : drillConfig.topicDrillSize;
  return round5((itemCount * AVG_SECONDS_PER_DRILL_ITEM) / 60);
}

function recommendationReasonFor(row: MasteryRow, band: TopicStatus, now: Date): string {
  const daysSince = row.lastPracticedAt ? daysBetween(row.lastPracticedAt, now) : null;
  const score = Math.round(row.masteryScore);

  if (daysSince !== null && daysSince >= 7) {
    return `You haven't practiced ${row.topic} in ${daysSince} day${daysSince === 1 ? "" : "s"}.`;
  }
  if (band === "WEAK" || band === "REVIEW") {
    return `You're at ${score}% in ${row.topic} — let's strengthen it.`;
  }
  if (band === "STRONG") {
    return `You're strong in ${row.topic} — a quick check keeps it sharp.`;
  }
  if (band === "IMPROVING") {
    return `You're improving in ${row.topic} — let's keep the momentum going.`;
  }
  return `New topic for you — let's build a foundation in ${row.topic}.`;
}

/** Fills a day/subject minute budget with topic-level activities, ranked
 * weakest/stalest/least-confident first. When `topics` is empty (a
 * subject with zero StudentTopicMastery rows — cold start), falls back to
 * `coldStartTopics` in curriculum order, all as LESSON, with one
 * PRACTICE_DRILL seeded when `isColdStartFinalDay` to start generating
 * real mastery signal for next week. */
export function selectTopicsForSlot(params: {
  subjectId: string;
  minutes: number;
  topics: MasteryRow[];
  coldStartTopics: string[];
  isColdStartFinalDay: boolean;
  daysToExam: number | null;
  drillConfig: DrillConfigInfo;
  now?: Date;
}): TopicSelection[] {
  const now = params.now ?? new Date();
  const bucket = examProximityBucket(params.daysToExam);
  let remaining = params.minutes;
  const items: TopicSelection[] = [];

  if (params.topics.length === 0) {
    if (params.coldStartTopics.length === 0) {
      // No mastery data AND no Lesson content exists for this subject at
      // all — rather than leaving the day empty, use the one activity
      // that never depends on stored content: a coach session.
      return [
        {
          topic: "General",
          activityType: "AI_COACH_SESSION",
          minutes: Math.min(remaining, DEFAULT_AI_COACH_MINUTES),
          recommendationReason: "Let's chat with your AI coach to build your study plan for this subject.",
          masteryScore: null,
        },
      ];
    }
    const lastIndex = params.coldStartTopics.length - 1;
    for (let idx = 0; idx < params.coldStartTopics.length && remaining >= MIN_USEFUL_CHUNK_MINUTES; idx++) {
      const topic = params.coldStartTopics[idx];
      const isFinal = params.isColdStartFinalDay && idx === lastIndex;
      const activityType: StudyActivityType = isFinal ? "PRACTICE_DRILL" : "LESSON";
      const minutes = Math.min(remaining, estimateMinutes(activityType, params.drillConfig, bucket));
      items.push({
        topic,
        activityType,
        minutes,
        recommendationReason: isFinal
          ? `Let's check what you've learned in ${topic} this week.`
          : `New topic for you — let's build a foundation in ${topic}.`,
        masteryScore: null,
      });
      remaining -= minutes;
    }
    if (remaining >= MIN_USEFUL_CHUNK_MINUTES && items.length > 0) {
      items[items.length - 1].minutes += remaining;
      remaining = 0;
    }
    return items;
  }

  const ordered = [...params.topics].sort((a, b) => topicPriority(b, now) - topicPriority(a, now) || a.topic.localeCompare(b.topic));

  for (let idx = 0; idx < ordered.length && remaining >= MIN_USEFUL_CHUNK_MINUTES; idx++) {
    const row = ordered[idx];
    const band = classifyMastery(row.masteryScore, row.confidenceScore);
    const activityType = activityTypeFor(band, bucket, idx);
    const minutes = Math.min(remaining, estimateMinutes(activityType, params.drillConfig, bucket));
    items.push({
      topic: row.topic,
      activityType,
      minutes,
      recommendationReason: recommendationReasonFor(row, band, now),
      masteryScore: Math.round(row.masteryScore),
    });
    remaining -= minutes;
  }

  if (remaining >= MIN_USEFUL_CHUNK_MINUTES && items.length > 0) {
    items[items.length - 1].minutes += remaining;
  }

  return items;
}
