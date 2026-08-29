import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import { examLabels } from "@/lib/exam-slugs";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { createSubject, renameSubject, renameOrMergeTopic } from "@/app/dashboard/admin/subjects/actions";

const inputClass =
  "rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";

export default async function AdminSubjectsPage() {
  await requireAdminPagePermission("subjects.manage");

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true, courses: true } } },
  });

  const [topicRows, examTypeRows] = await Promise.all([
    prisma.question.groupBy({
      by: ["subjectId", "topic"],
      where: { topic: { not: null } },
      _count: { _all: true },
    }),
    // Exam type isn't a field on Subject — it's set per-question (and per
    // passage/course). A subject's exam-type coverage is whichever exams its
    // questions currently belong to, computed here rather than stored, so
    // one subject (e.g. "Biology") can keep being shared across WAEC/NECO/
    // UTME the way the rest of the app already relies on.
    prisma.question.groupBy({
      by: ["subjectId", "exam"],
      _count: { _all: true },
    }),
  ]);

  const topicsBySubjectId = new Map<string, { name: string; count: number }[]>();
  for (const row of topicRows) {
    if (!row.topic) continue;
    const list = topicsBySubjectId.get(row.subjectId) ?? [];
    list.push({ name: row.topic, count: row._count._all });
    topicsBySubjectId.set(row.subjectId, list);
  }

  const examTypesBySubjectId = new Map<string, { exam: (typeof examTypeRows)[number]["exam"]; count: number }[]>();
  for (const row of examTypeRows) {
    const list = examTypesBySubjectId.get(row.subjectId) ?? [];
    list.push({ exam: row.exam, count: row._count._all });
    examTypesBySubjectId.set(row.subjectId, list);
  }

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Subjects & topics</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Exam types (WAEC, NECO, UTME, Post-UTME) are a fixed set built into the platform.
        Subjects and topics are managed here.
      </p>

      <div className="mt-6">
        <Card title="Add subject">
          <form action={createSubject} className="flex gap-2">
            <input name="name" placeholder="e.g. Further Mathematics" required className={`flex-1 ${inputClass}`} />
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Add
            </button>
          </form>
          <p className="mt-2 text-xs text-text-muted">
            A subject isn&apos;t tied to one exam type — the same subject (e.g. Biology) can hold
            questions for WAEC, NECO, and UTME at once. Exam type is set per question, in{" "}
            <Link href="/dashboard/admin/questions/new" className="text-brand-text hover:underline">
              New question
            </Link>
            .
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="All subjects">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2 pr-3">Subject name</th>
                  <th className="pb-2 pr-3">Exam type</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Questions</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => {
                  const examTypes = examTypesBySubjectId.get(subject.id) ?? [];
                  return (
                    <tr key={subject.id} className="border-t border-border">
                      <td className="py-2 pr-3 text-text-primary">{subject.name}</td>
                      <td className="py-2 pr-3">
                        {examTypes.length === 0 ? (
                          <Badge tone="neutral">Not Assigned</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {examTypes.map(({ exam }) => (
                              <Badge key={exam} tone="brand">
                                {examLabels[exam]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {subject._count.questions > 0 ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge tone="warning">No questions yet</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-text-secondary">{subject._count.questions}</td>
                      <td className="py-2">
                        <a href={`#subject-${subject.id}`} className="text-xs text-brand-text hover:underline">
                          Manage →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {subjects.map((subject) => {
          const topics = topicsBySubjectId.get(subject.id) ?? [];
          return (
            <Card
              key={subject.id}
              id={`subject-${subject.id}`}
              title={`${subject.name} — ${subject._count.questions} questions, ${subject._count.courses} courses`}
            >
              <form action={renameSubject} className="flex gap-2">
                <input type="hidden" name="id" value={subject.id} />
                <input name="name" defaultValue={subject.name} required className={`flex-1 ${inputClass}`} />
                <button type="submit" className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted">
                  Rename
                </button>
              </form>

              {topics.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-text-muted">Topics</p>
                  <div className="mt-2 space-y-2">
                    {topics.map((topic) => (
                      <form
                        key={topic.name}
                        action={renameOrMergeTopic}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <input type="hidden" name="subjectId" value={subject.id} />
                        <input type="hidden" name="from" value={topic.name} />
                        <span className="text-text-secondary">
                          {topic.name} <span className="text-xs text-text-muted">({topic.count})</span>
                        </span>
                        <span className="text-text-muted">→</span>
                        <input
                          name="to"
                          placeholder="Rename to / merge into…"
                          className={`w-56 ${inputClass}`}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
                        >
                          Apply
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
