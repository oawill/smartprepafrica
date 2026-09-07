import { Prisma, type ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Defaults used the first time an exam's drill config is looked up —
 * admins can change these afterward via the admin Readiness & Drills
 * settings page (ExamDrillConfig rows). Quick Check/Topic Drill/Practice
 * Session/Challenge sizes (5/10/20/40) are SmartPrepAfrica's own practice
 * presets, not tied to any exam's official structure. Full Mock defaults:
 * UTME's 4-subject / 200-question / 180-minute CBT structure is real,
 * well-known public information about JAMB's exam format, encoded as such.
 * WAEC/NECO/Post-UTME per-paper timing varies by subject and can't be
 * honestly encoded as one official number, so their defaults are
 * SmartPrepAfrica's own pacing guideline — same caveat already used for
 * TOEFL's Reading/Listening section timing in src/lib/toefl/config.ts. */
export const DEFAULT_EXAM_DRILL_CONFIG: Record<
  ExamType,
  {
    quickCheckSize: number;
    topicDrillSize: number;
    practiceSessionSize: number;
    challengeSize: number;
    fullMockSubjectCount: number;
    fullMockQuestionsPerSubject: number;
    fullMockTimeLimitMinutes: number;
    minTopicsForReadiness: number;
  }
> = {
  WAEC: {
    quickCheckSize: 5,
    topicDrillSize: 10,
    practiceSessionSize: 20,
    challengeSize: 40,
    fullMockSubjectCount: 4,
    fullMockQuestionsPerSubject: 40,
    fullMockTimeLimitMinutes: 60,
    minTopicsForReadiness: 3,
  },
  NECO: {
    quickCheckSize: 5,
    topicDrillSize: 10,
    practiceSessionSize: 20,
    challengeSize: 40,
    fullMockSubjectCount: 4,
    fullMockQuestionsPerSubject: 40,
    fullMockTimeLimitMinutes: 60,
    minTopicsForReadiness: 3,
  },
  // Real UTME/JAMB CBT structure: English Language (compulsory) + 3
  // electives, 50 questions per subject (200 total), 180 minutes.
  UTME: {
    quickCheckSize: 5,
    topicDrillSize: 10,
    practiceSessionSize: 20,
    challengeSize: 40,
    fullMockSubjectCount: 4,
    fullMockQuestionsPerSubject: 50,
    fullMockTimeLimitMinutes: 180,
    minTopicsForReadiness: 3,
  },
  // Post-UTME structure varies by institution — this is a generic
  // SmartPrepAfrica default until institution-specific configuration
  // exists (see readiness-service.ts's doc comments).
  POST_UTME: {
    quickCheckSize: 5,
    topicDrillSize: 10,
    practiceSessionSize: 20,
    challengeSize: 40,
    fullMockSubjectCount: 4,
    fullMockQuestionsPerSubject: 40,
    fullMockTimeLimitMinutes: 60,
    minTopicsForReadiness: 3,
  },
};

export type ExamDrillConfigValues = (typeof DEFAULT_EXAM_DRILL_CONFIG)[ExamType];

/** Upsert-on-read, mirroring getMonthlyLimitForPlan's existing AiPlanLimit
 * pattern (src/lib/ai/limits.ts) — every exam keeps working with sane
 * defaults until an admin explicitly edits a value, no seed migration
 * required. Readiness-page loads call this multiple times concurrently for
 * the same exam (e.g. getExamReadiness + getBiggestOpportunity in the same
 * Promise.all), so the very first call for a given exam can race two
 * concurrent inserts — caught here and resolved by re-reading the row the
 * other insert just created, rather than surfacing a 500. */
export async function getDrillConfig(exam: ExamType): Promise<ExamDrillConfigValues> {
  const defaults = DEFAULT_EXAM_DRILL_CONFIG[exam];
  let row;
  try {
    row = await prisma.examDrillConfig.upsert({
      where: { exam },
      update: {},
      create: { exam, ...defaults },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      row = await prisma.examDrillConfig.findUniqueOrThrow({ where: { exam } });
    } else {
      throw error;
    }
  }
  return {
    quickCheckSize: row.quickCheckSize,
    topicDrillSize: row.topicDrillSize,
    practiceSessionSize: row.practiceSessionSize,
    challengeSize: row.challengeSize,
    fullMockSubjectCount: row.fullMockSubjectCount,
    fullMockQuestionsPerSubject: row.fullMockQuestionsPerSubject,
    fullMockTimeLimitMinutes: row.fullMockTimeLimitMinutes,
    minTopicsForReadiness: row.minTopicsForReadiness,
  };
}
