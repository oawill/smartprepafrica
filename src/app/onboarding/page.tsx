import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStudentProfile } from "@/app/onboarding/actions";
import { OnboardingWizard, type OnboardingStep } from "@/app/onboarding/onboarding-wizard";
import { EXAM_CODE_TO_EXAM_TYPE, EXAM_TYPE_TO_EXAM_CODE } from "@/lib/exam-type-mapping";

const STEP_ORDER: OnboardingStep[] = ["class", "track", "subjects", "exams", "weak-subjects", "goal"];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=%2Fonboarding");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  await ensureStudentProfile(session.user.id);

  const profile = await prisma.studentProfile.findUniqueOrThrow({
    where: { userId: session.user.id },
    select: {
      gradeLevel: true,
      academicTrack: true,
      targetExams: true,
      targetSubjects: { select: { id: true } },
      weakSubjects: { select: { id: true } },
      studyGoal: true,
      onboardingCompleted: true,
      user: { select: { countryId: true } },
    },
  });

  const [subjects, countryExams] = await Promise.all([
    prisma.subject.findMany({
      select: { id: true, name: true, academicTracks: true },
      orderBy: { name: "asc" },
    }),
    prisma.countryExam.findMany({
      where: { status: "ACTIVE", ...(profile.user.countryId ? { countryId: profile.user.countryId } : {}) },
      select: { exam: { select: { code: true, name: true } } },
      orderBy: { exam: { name: "asc" } },
    }),
  ]);

  if (profile.onboardingCompleted) redirect("/dashboard");

  // Resume at the right step: an explicit ?step= from a just-completed
  // step's redirect wins; otherwise resume from whatever's still unset so
  // a refresh never loses progress or repeats an answered question.
  const requestedStep = (await searchParams).step as OnboardingStep | undefined;
  let resumeStep: OnboardingStep = "class";
  if (!profile.gradeLevel) resumeStep = "class";
  else if (!profile.academicTrack) resumeStep = "track";
  else if (profile.targetSubjects.length === 0) resumeStep = "subjects";
  else if (profile.targetExams.length === 0) resumeStep = "exams";
  else if (profile.weakSubjects.length === 0) resumeStep = "weak-subjects";
  else resumeStep = "goal";

  const step = requestedStep && STEP_ORDER.includes(requestedStep) ? requestedStep : resumeStep;

  // Exam codes mapped to the app's existing ExamType enum — only exams
  // that already exist in the country's active configuration are ever
  // offered here. StudentProfile.targetExams (the field this step saves
  // to) only covers WAEC/NECO/UTME/POST_UTME today — international exams
  // like SAT/TOEFL are tracked through a separate purchase-based system,
  // not this profile field, so they're intentionally not offered here.
  const examOptions = countryExams
    .map((ce) => ({ code: ce.exam.code, name: ce.exam.name }))
    .filter((e) => e.code in EXAM_CODE_TO_EXAM_TYPE)
    .filter((e, i, all) => all.findIndex((x) => x.code === e.code) === i);

  return (
    <OnboardingWizard
      step={step}
      stepIndex={STEP_ORDER.indexOf(step) + 1}
      totalSteps={STEP_ORDER.length}
      subjects={subjects}
      examOptions={examOptions}
      current={{
        gradeLevel: profile.gradeLevel,
        academicTrack: profile.academicTrack,
        targetSubjectIds: profile.targetSubjects.map((s) => s.id),
        examCodes: profile.targetExams.map((e) => EXAM_TYPE_TO_EXAM_CODE[e]),
        weakSubjectIds: profile.weakSubjects.map((s) => s.id),
        studyGoal: profile.studyGoal,
      }}
    />
  );
}
