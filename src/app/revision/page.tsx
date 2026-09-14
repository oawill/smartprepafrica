import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { examLabels } from "@/lib/exam-slugs";
import { classifyMastery } from "@/lib/practice/readiness-service";
import { startRevisionSession, archiveRevisionItem } from "@/app/revision/actions";

const FILTERS = [
  { key: "due", label: "Due for review" },
  { key: "repeated", label: "Repeated mistakes" },
  { key: "recent", label: "Recently missed" },
  { key: "mastered", label: "Mastered" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const PAGE_SIZE = 20;

export default async function SmartRevisionPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=%2Frevision");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const userId = session.user.id;
  const { filter: filterParam } = await searchParams;
  const filter: FilterKey = (FILTERS.find((f) => f.key === filterParam)?.key ?? "due") as FilterKey;

  const [totalActive, dueCount, improvingCount, masteredCount, subjectGroups, topicMasteryRows] = await Promise.all([
    prisma.studentRevisionItem.count({ where: { userId, archived: false } }),
    prisma.studentRevisionItem.count({ where: { userId, archived: false, status: { not: "MASTERED" } } }),
    prisma.studentRevisionItem.count({ where: { userId, archived: false, status: "IMPROVING" } }),
    prisma.studentRevisionItem.count({ where: { userId, archived: false, status: "MASTERED" } }),
    prisma.studentRevisionItem.groupBy({
      by: ["subjectId"],
      where: { userId, archived: false, status: { not: "MASTERED" } },
      _count: { _all: true },
    }),
    prisma.studentTopicMastery.findMany({
      where: { userId, confidenceScore: { gt: 0.15 } },
      select: { subjectId: true, topic: true, masteryScore: true, confidenceScore: true },
    }),
  ]);

  if (totalActive === 0 && masteredCount === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-h1 font-semibold text-text-primary">Your Mistake Bank is empty</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Questions you get wrong during practice and mock exams will appear here so SmartPrepAfrica can help you
          revise them.
        </p>
        <Link href="/practice" className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
          Start Practice
        </Link>
      </div>
    );
  }

  const subjectIds = subjectGroups.map((g) => g.subjectId);
  const [subjects, topicGroups] = await Promise.all([
    prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } }),
    prisma.studentRevisionItem.groupBy({
      by: ["subjectId", "topic"],
      where: { userId, archived: false, status: { not: "MASTERED" } },
      _count: { _all: true },
      _max: { priority: true },
    }),
  ]);
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
  const topicMasteryByKey = new Map(topicMasteryRows.map((r) => [`${r.subjectId}::${r.topic}`, r]));

  const recommended = [...topicGroups]
    .sort((a, b) => (b._max.priority ?? 0) - (a._max.priority ?? 0))
    .slice(0, 3);

  const filterWhere =
    filter === "due"
      ? { status: { not: "MASTERED" as const } }
      : filter === "repeated"
        ? { incorrectCount: { gte: 2 } }
        : filter === "mastered"
          ? { status: "MASTERED" as const }
          : {}; // recent — no extra filter, just most-recently-missed order

  const listItems = await prisma.studentRevisionItem.findMany({
    where: { userId, archived: false, ...filterWhere },
    orderBy: filter === "recent" ? { lastMissedAt: "desc" } : { priority: "desc" },
    take: PAGE_SIZE,
    include: { subject: { select: { name: true } }, question: { select: { prompt: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-text-primary">Smart Revision</h1>
          <p className="mt-1 text-sm text-text-secondary">Review the questions and topics that need the most attention.</p>
        </div>
        <Link href="/dashboard/student" className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
          ← Dashboard
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card title="Questions to review">
          <p className="text-2xl font-semibold text-text-primary">{dueCount}</p>
        </Card>
        <Card title="Recently improved">
          <p className="text-2xl font-semibold text-brand-text">{improvingCount}</p>
        </Card>
        <Card title="Mastered">
          <p className="text-2xl font-semibold text-success">{masteredCount}</p>
        </Card>
      </div>

      {recommended.length > 0 && (
        <div className="mt-6">
          <Card title="Recommended Revision">
            <div className="space-y-3">
              {recommended.map((g, i) => (
                <div key={`${g.subjectId}::${g.topic}`} className={i > 0 ? "border-t border-border pt-3" : ""}>
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-text">{subjectNameById.get(g.subjectId) ?? "Subject"}</p>
                  <p className="text-sm font-medium text-text-primary">{g.topic ?? "General"}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    You have missed {g._count._all} question{g._count._all === 1 ? "" : "s"} in this topic recently.
                  </p>
                  <form action={startRevisionSession} className="mt-2">
                    <input type="hidden" name="subjectId" value={g.subjectId} />
                    {g.topic && <input type="hidden" name="topic" value={g.topic} />}
                    <button type="submit" className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                      Start 10-Minute Revision
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <form action={startRevisionSession}>
          <button type="submit" className="w-full rounded-lg bg-brand py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
            Start Revision
          </button>
        </form>
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-muted">Your Mistake Bank</h2>
      <div className="mt-2 space-y-2">
        {subjectGroups.length === 0 ? (
          <p className="text-sm text-text-secondary">No active mistakes in any subject — nice work.</p>
        ) : (
          subjectGroups.map((g) => {
            const topics = topicGroups.filter((t) => t.subjectId === g.subjectId);
            return (
              <details key={g.subjectId} className="rounded-lg border border-border">
                <summary className="cursor-pointer rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm font-medium text-text-primary hover:border-brand">
                  {subjectNameById.get(g.subjectId) ?? "Subject"} — {g._count._all} question{g._count._all === 1 ? "" : "s"}
                </summary>
                <div className="space-y-2 p-4">
                  {topics.map((t) => {
                    const mastery = topicMasteryByKey.get(`${t.subjectId}::${t.topic}`);
                    const band = mastery ? classifyMastery(mastery.masteryScore, mastery.confidenceScore) : null;
                    return (
                      <div key={`${t.subjectId}::${t.topic}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{t.topic ?? "General"}</p>
                          <p className="text-xs text-text-muted">
                            {t._count._all} mistake{t._count._all === 1 ? "" : "s"}
                            {band && band !== "NOT_ENOUGH_DATA" ? ` · Topic performance: ${band.charAt(0) + band.slice(1).toLowerCase()}` : ""}
                          </p>
                        </div>
                        <form action={startRevisionSession}>
                          <input type="hidden" name="subjectId" value={t.subjectId} />
                          {t.topic && <input type="hidden" name="topic" value={t.topic} />}
                          <button type="submit" className="shrink-0 rounded-full border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-brand">
                            Revise
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })
        )}
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-muted">Browse Mistakes</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/revision?filter=${f.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === f.key ? "border-brand bg-brand/10 text-brand-text" : "border-border-strong text-text-secondary"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {listItems.length === 0 ? (
          <p className="text-sm text-text-secondary">Nothing here yet.</p>
        ) : (
          listItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-surface-raised p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-text">
                    {examLabels[item.exam]} {item.subject.name}
                  </p>
                  <p className="text-sm text-text-primary">{item.topic ?? "General"}</p>
                  <p className="mt-1 text-xs text-text-secondary line-clamp-2">{item.question.prompt}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border-strong px-2 py-0.5 text-[11px] text-text-muted">
                  {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Missed {item.incorrectCount} time{item.incorrectCount === 1 ? "" : "s"}
                {item.lastReviewedAt ? ` · Last reviewed ${item.lastReviewedAt.toLocaleDateString()}` : ""}
              </p>
              {item.status !== "MASTERED" && (
                <div className="mt-2 flex gap-2">
                  <form action={archiveRevisionItem}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit" className="text-xs text-text-muted hover:text-text-secondary">
                      Archive
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
