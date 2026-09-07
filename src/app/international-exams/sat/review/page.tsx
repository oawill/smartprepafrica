import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AnswerOption } from "@/components/exam/answer-option";
import { MessageContent } from "@/components/ai-coach/message-content";
import { MathText } from "@/components/sat/math-text";
import { SatAskAi } from "@/components/sat/sat-ask-ai";
import { SatEmptyState } from "@/components/sat/sat-empty-state";
import { asOptions } from "@/lib/practice-types";
import { isSatEnabled } from "@/lib/sat/config";
import { SAT_SECTION_LABELS } from "@/lib/sat/types";

export const metadata: Metadata = {
  title: "SAT Review",
};

type StatusFilter = "all" | "correct" | "incorrect" | "skipped" | "flagged";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  correct: "Correct",
  incorrect: "Incorrect",
  skipped: "Skipped",
  flagged: "Flagged",
};

export default async function SatReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; section?: string; domain?: string; difficulty?: string }>;
}) {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/sat/review");
  await requireExamProductEntitlement(session.user.id, "SAT");
  const userId = session.user.id;

  const params = await searchParams;
  const status = (["all", "correct", "incorrect", "skipped", "flagged"] as StatusFilter[]).includes(
    params.status as StatusFilter
  )
    ? (params.status as StatusFilter)
    : "all";
  const section = params.section === "READING_WRITING" || params.section === "MATH" ? params.section : undefined;
  const domain = params.domain?.trim() || undefined;
  const difficulty =
    params.difficulty === "EASY" || params.difficulty === "MEDIUM" || params.difficulty === "HARD"
      ? params.difficulty
      : undefined;

  const statusWhere =
    status === "correct"
      ? { isCorrect: true }
      : status === "incorrect"
        ? { isCorrect: false }
        : status === "skipped"
          ? { isCorrect: null }
          : status === "flagged"
            ? { flagged: true }
            : {};

  const [items, availableDomains] = await Promise.all([
    prisma.satAttemptItem.findMany({
      where: {
        attempt: { userId, submittedAt: { not: null } },
        ...statusWhere,
        content: {
          ...(section ? { section } : {}),
          ...(domain ? { domain } : {}),
          ...(difficulty ? { difficulty } : {}),
        },
      },
      include: { content: true, attempt: { select: { kind: true, submittedAt: true } } },
      orderBy: { attempt: { submittedAt: "desc" } },
      take: 50,
    }),
    prisma.satContent.findMany({
      select: { section: true, domain: true },
      distinct: ["section", "domain"],
      orderBy: { domain: "asc" },
    }),
  ]);

  function itemStatus(item: (typeof items)[number]): StatusFilter {
    if (item.flagged) return "flagged";
    if (item.isCorrect === true) return "correct";
    if (item.isCorrect === false) return "incorrect";
    return "skipped";
  }

  function filterHref(overrides: Record<string, string | undefined>) {
    const merged = { status, section, domain, difficulty, ...overrides };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all") sp.set(k, v);
    const qs = sp.toString();
    return `/international-exams/sat/review${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Review</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Every question from your completed SAT attempts, filterable by how you did on it.
      </p>

      <div className="mt-6">
        <Card title="Filters">
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-raised p-1 text-xs">
            {(["all", "correct", "incorrect", "skipped", "flagged"] as StatusFilter[]).map((key) => (
              <Link
                key={key}
                href={filterHref({ status: key })}
                className={`rounded-md px-3 py-1.5 ${
                  status === key ? "bg-brand text-brand-foreground" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {STATUS_LABELS[key]}
              </Link>
            ))}
          </div>

          <form className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="status" value={status} />
            <select
              name="section"
              defaultValue={section ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any section</option>
              <option value="READING_WRITING">{SAT_SECTION_LABELS.READING_WRITING}</option>
              <option value="MATH">{SAT_SECTION_LABELS.MATH}</option>
            </select>
            <select
              name="domain"
              defaultValue={domain ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any domain</option>
              {availableDomains.map((d) => (
                <option key={`${d.section}::${d.domain}`} value={d.domain}>
                  {SAT_SECTION_LABELS[d.section]} · {d.domain}
                </option>
              ))}
            </select>
            <select
              name="difficulty"
              defaultValue={difficulty ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any difficulty</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
            <button
              type="submit"
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Apply
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-8 space-y-6">
        {items.length === 0 ? (
          <SatEmptyState message="No questions match these filters yet." />
        ) : (
          items.map((item) => {
            const isNumeric = item.content.questionType === "STUDENT_PRODUCED_RESPONSE";
            const options = isNumeric ? [] : asOptions(item.content.options);
            const st = itemStatus(item);
            return (
              <Card
                key={item.id}
                title={`${SAT_SECTION_LABELS[item.content.section]} · ${item.content.domain} · ${STATUS_LABELS[st]}`}
              >
                {item.content.passage && (
                  <div className="prose-passage text-xs leading-6 text-text-muted">{item.content.passage}</div>
                )}
                <div className="mt-3 text-sm font-medium text-text-primary">
                  <MessageContent content={item.content.prompt} />
                </div>
                {isNumeric ? (
                  <div className="mt-3 text-sm">
                    <p className="text-text-secondary">
                      Your answer:{" "}
                      <span className={item.isCorrect ? "text-success" : "text-danger"}>
                        {item.numericAnswer ?? "(no answer)"}
                      </span>
                    </p>
                    {!item.isCorrect && (
                      <p className="text-text-secondary">
                        Correct answer: <span className="text-success">{item.content.correctValue}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {options.map((opt) => {
                      const state =
                        opt.key === item.content.correctOption
                          ? "correct"
                          : opt.key === item.selectedOption
                            ? "incorrect"
                            : "default";
                      return (
                        <AnswerOption key={opt.key} optionKey={opt.key} state={state}>
                          <MathText text={opt.text} />
                        </AnswerOption>
                      );
                    })}
                  </div>
                )}
                {item.content.explanation && (
                  <div className="mt-3 text-xs">
                    <MessageContent content={item.content.explanation} />
                  </div>
                )}
                {item.isCorrect === false && (
                  <div className="mt-3">
                    <SatAskAi
                      section={item.content.section}
                      domain={item.content.domain}
                      passage={item.content.passage}
                      prompt={item.content.prompt}
                      options={item.content.options}
                      correctOption={item.content.correctOption}
                      correctValue={item.content.correctValue}
                      selectedOption={item.selectedOption}
                      numericAnswer={item.numericAnswer}
                      explanation={item.content.explanation}
                    />
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
