import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asOptions } from "@/lib/practice-types";
import { examLabels, examSlugFor } from "@/lib/exam-slugs";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { AnswerOption, type AnswerOptionState } from "@/components/exam/answer-option";
import { Badge } from "@/components/ui/badge";
import { DrillResults, type TopicBucket } from "@/components/readiness/drill-results";
import { getRecommendedDrillAfterAttempt } from "@/lib/practice/readiness-service";
import { getStudyPlanView, getCurrentActivity } from "@/lib/study-plan/view";
import { weekStartFor } from "@/lib/study-plan/regenerate";
import { startTopicDrill } from "@/app/practice/drills/actions";

export default async function ResultsPage({
  params,
}: PageProps<"/practice/results/[attemptId]">) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      responses: {
        orderBy: { order: "asc" },
        include: { question: { include: { passageGroup: true } } },
      },
    },
  });

  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/practice/session/${attempt.id}`);

  const correctCount = attempt.responses.filter((r) => r.isCorrect).length;

  const missedTopicCounts = new Map<string, number>();
  for (const r of attempt.responses) {
    if (r.isCorrect !== false) continue;
    const topic = r.question.topic;
    if (!topic) continue;
    missedTopicCounts.set(topic, (missedTopicCounts.get(topic) ?? 0) + 1);
  }
  const weakTopics = [...missedTopicCounts.entries()].sort((a, b) => b[1] - a[1]);

  const recommendedLessons = weakTopics.length
    ? await prisma.lesson.findMany({
        where: {
          topic: { in: weakTopics.map(([topic]) => topic) },
          module: { course: { published: true } },
        },
        include: { module: { include: { course: { select: { id: true, title: true } } } } },
        take: 4,
      })
    : [];

  // Drill Complete analysis — additive, only for Quick Drill (STUDY_DRILL)
  // attempts. Free-practice/CBT/mock attempts render exactly as before.
  let drillTopicBuckets: TopicBucket[] = [];
  let recommendedDrill = null;
  if (attempt.mode === "STUDY_DRILL") {
    const bucketMap = new Map<string, TopicBucket>();
    for (const r of attempt.responses) {
      if (!r.question.topic || r.isCorrect === null) continue;
      const bucket = bucketMap.get(r.question.topic) ?? { topic: r.question.topic, correct: 0, total: 0 };
      bucket.total += 1;
      if (r.isCorrect) bucket.correct += 1;
      bucketMap.set(r.question.topic, bucket);
    }
    drillTopicBuckets = [...bucketMap.values()];
    recommendedDrill = await getRecommendedDrillAfterAttempt(attemptId);
  }

  // Revision-specific completion summary (brief §24) — only real,
  // already-computed data: which topics had a previously-wrong question
  // answered correctly in this exact session, and the soonest real
  // next-review date among items this session touched (never a
  // fabricated date).
  let revisionSummary: { topicsImproved: string[]; needsAnotherReview: number; nextReviewAt: Date | null } | null = null;
  if (attempt.mode === "REVISION") {
    const questionIds = attempt.responses.map((r) => r.questionId);
    const revisionItems = await prisma.studentRevisionItem.findMany({
      where: { userId: session.user.id, questionId: { in: questionIds } },
      select: { questionId: true, nextReviewAt: true },
    });
    const nextReviewByQuestionId = new Map(revisionItems.map((i) => [i.questionId, i.nextReviewAt]));

    const topicsImproved = [
      ...new Set(
        attempt.responses
          .filter((r) => r.isCorrect === true && r.question.topic)
          .map((r) => r.question.topic!)
      ),
    ];
    const needsAnotherReview = attempt.responses.filter((r) => r.isCorrect === false).length;
    const futureDates = attempt.responses
      .map((r) => nextReviewByQuestionId.get(r.questionId))
      .filter((d): d is Date => !!d);
    const nextReviewAt = futureDates.length > 0 ? new Date(Math.min(...futureDates.map((d) => d.getTime()))) : null;

    revisionSummary = { topicsImproved, needsAnotherReview, nextReviewAt };
  }

  // Smart Revision sessions offer a way to practice fresh questions on
  // the same topics instead of only re-seeing the exact ones just
  // reviewed (brief's "Practice Similar Questions" — reuses the existing
  // topic-drill action unchanged, never the same question repeatedly).
  const similarTopics =
    attempt.mode === "REVISION"
      ? [...new Map(attempt.responses.map((r) => [`${r.question.subjectId}::${r.question.topic}`, { subjectId: r.question.subjectId, topic: r.question.topic }])).values()]
      : [];

  // If this attempt completed a Today's Study activity, there's likely a
  // next one waiting — surface a direct way back instead of requiring a
  // manual return to the dashboard (brief's "return-to-study" behavior).
  const studyPlanView = await getStudyPlanView(session.user.id, weekStartFor(new Date()));
  const nextTodayActivity = studyPlanView ? getCurrentActivity(studyPlanView) : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/practice" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back to exams
        </Link>
        {nextTodayActivity && (
          <Link
            href="/study/today"
            className="text-sm font-medium text-brand-text hover:underline"
          >
            Continue Today&apos;s Study →
          </Link>
        )}
        <AiCoachPanel
          context={{}}
          defaultMode="EXAM_PREP"
          suggestedPrompts={[
            "What should I study today?",
            "What am I weak at?",
            "Quiz me on my weakest topic",
            "Am I ready for my exam?",
          ]}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-8 text-center">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          {examLabels[attempt.exam]} · {attempt.mode.replace("_", " ")}
        </p>
        <p className="mt-2 text-5xl font-semibold text-brand-text">
          {Math.round(attempt.score ?? 0)}%
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          {correctCount} of {attempt.totalItems} correct
        </p>
        <Link
          href={`/practice/${examSlugFor(attempt.exam)}`}
          className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Retest
        </Link>
      </div>

      {revisionSummary && (
        <div className="mt-6 rounded-xl border border-border bg-surface-raised p-5">
          <p className="text-sm font-medium text-text-primary">Revision Complete</p>
          <p className="mt-1 text-sm text-text-secondary">
            {attempt.totalItems} question{attempt.totalItems === 1 ? "" : "s"} reviewed
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Correct</p>
              <p className="font-semibold text-success">{correctCount}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Needs another review</p>
              <p className="font-semibold text-warning">{revisionSummary.needsAnotherReview}</p>
            </div>
          </div>
          {revisionSummary.topicsImproved.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Topics improved</p>
              <p className="mt-1 text-sm text-text-secondary">{revisionSummary.topicsImproved.join(", ")}</p>
            </div>
          )}
          {revisionSummary.nextReviewAt && (
            <p className="mt-3 text-xs text-text-muted">
              Next recommended review: {revisionSummary.nextReviewAt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      )}

      {similarTopics.length > 0 && (
        <div className="mt-6 rounded-xl border border-brand/40 bg-brand/10 p-5">
          <p className="text-sm font-medium text-brand-text">Practice Similar Questions</p>
          <p className="mt-1 text-xs text-text-secondary">
            Fresh questions on the same topics, not the exact ones you just reviewed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {similarTopics.map(({ subjectId, topic }) => (
              <form key={`${subjectId}::${topic}`} action={startTopicDrill}>
                <input type="hidden" name="exam" value={attempt.exam} />
                <input type="hidden" name="subjectId" value={subjectId} />
                {topic && <input type="hidden" name="topic" value={topic} />}
                <button type="submit" className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                  {topic ?? "Practice"}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {attempt.mode === "STUDY_DRILL" && (
        <div className="mt-6">
          <DrillResults
            exam={attempt.exam}
            score={attempt.score ?? 0}
            correctCount={correctCount}
            totalItems={attempt.totalItems}
            topicBuckets={drillTopicBuckets}
            recommendation={recommendedDrill}
          />
        </div>
      )}

      {weakTopics.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-raised p-5">
            <p className="text-sm font-medium text-text-secondary">Weak concepts</p>
            <ul className="mt-2 space-y-1 text-sm">
              {weakTopics.map(([topic, missed]) => (
                <li key={topic} className="flex justify-between text-text-secondary">
                  <span>{topic}</span>
                  <span className="text-text-muted">{missed} missed</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-brand/40 bg-brand/10 p-5">
            <p className="text-sm font-medium text-brand-text">Recommended review</p>
            {recommendedLessons.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">
                No lessons cover these topics yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {recommendedLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/learn/${lesson.module.course.id}/lessons/${lesson.id}`}
                      className="text-brand-text hover:underline"
                    >
                      {lesson.title}
                    </Link>
                    <span className="text-text-muted"> — {lesson.module.course.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {attempt.responses.map((response, i) => {
          const options = asOptions(response.question.options);
          return (
            <div
              key={response.id}
              className="rounded-xl border border-border bg-surface-raised p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-text-muted">Question {i + 1}</p>
                {response.flagged && <Badge tone="warning">Flagged for review</Badge>}
              </div>
              {response.question.passageGroup && (
                <p className="mt-1 text-[11px] uppercase tracking-wide text-text-muted">
                  {response.question.passageGroup.title ?? "Passage-based question"}
                </p>
              )}
              <p className="mt-1 text-question font-medium text-text-primary">{response.question.prompt}</p>

              <div className="mt-3 space-y-1.5" role="list">
                {options.map((option) => {
                  const isCorrectOption = option.key === response.question.correctOption;
                  const isSelected = option.key === response.selectedOption;
                  const state: AnswerOptionState = isCorrectOption
                    ? "correct"
                    : isSelected
                      ? "incorrect"
                      : "default";
                  return (
                    <AnswerOption key={option.key} optionKey={option.key} state={state}>
                      <span className="text-answer">{option.text}</span>
                    </AnswerOption>
                  );
                })}
              </div>

              {response.question.explanation && (
                <p className="mt-3 text-sm text-text-secondary">
                  {response.question.explanation}
                </p>
              )}

              {response.isCorrect === false && (
                <div className="mt-3">
                  <AiCoachPanel
                    context={{}}
                    defaultMode="ASK"
                    triggerLabel="Ask AI Coach"
                    triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-brand/50 px-3 py-1.5 text-xs font-medium text-brand-text hover:border-brand"
                    suggestedPrompts={[
                      "Why was my answer wrong?",
                      "Explain the solution",
                      "Give me a similar question",
                      "Show me the shortcut",
                    ]}
                    focusQuestion={{
                      prompt: `${response.question.prompt}\nOptions: ${options.map((o) => `${o.key}) ${o.text}`).join(", ")}`,
                      studentAnswer: response.selectedOption
                        ? `${response.selectedOption}) ${options.find((o) => o.key === response.selectedOption)?.text ?? ""}`
                        : null,
                      correctAnswer: `${response.question.correctOption}) ${options.find((o) => o.key === response.question.correctOption)?.text ?? ""}`,
                      explanation: response.question.explanation,
                      topic: response.question.topic,
                      passage: response.question.passageGroup
                        ? {
                            type: response.question.passageGroup.type,
                            title: response.question.passageGroup.title,
                            bodyText: response.question.passageGroup.bodyText,
                            lineRef:
                              response.question.passageLineRef ??
                              (response.question.passageLineStart
                                ? `Lines ${response.question.passageLineStart}–${
                                    response.question.passageLineEnd ?? response.question.passageLineStart
                                  }`
                                : null),
                          }
                        : null,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
