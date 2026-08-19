import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { createSubject, renameSubject, renameOrMergeTopic } from "@/app/dashboard/admin/subjects/actions";

const inputClass =
  "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500";

export default async function AdminSubjectsPage() {
  await requireAdminPagePermission("subjects.manage");

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true, courses: true } } },
  });

  const topicsBySubject = await Promise.all(
    subjects.map(async (s) => {
      const topics = await prisma.question.groupBy({
        by: ["topic"],
        where: { subjectId: s.id, topic: { not: null } },
        _count: { _all: true },
      });
      return { subjectId: s.id, topics: topics.filter((t) => t.topic).map((t) => ({ name: t.topic!, count: t._count._all })) };
    })
  );
  const topicsBySubjectId = new Map(topicsBySubject.map((t) => [t.subjectId, t.topics]));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Subjects & topics</h1>
      <p className="mt-1 text-sm text-slate-400">
        Exam types (WAEC, NECO, UTME, Post-UTME) are a fixed set built into the platform.
        Subjects and topics are managed here.
      </p>

      <div className="mt-6">
        <Card title="Add subject">
          <form action={createSubject} className="flex gap-2">
            <input name="name" placeholder="e.g. Further Mathematics" required className={`flex-1 ${inputClass}`} />
            <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400">
              Add
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {subjects.map((subject) => {
          const topics = topicsBySubjectId.get(subject.id) ?? [];
          return (
            <Card
              key={subject.id}
              title={`${subject.name} — ${subject._count.questions} questions, ${subject._count.courses} courses`}
            >
              <form action={renameSubject} className="flex gap-2">
                <input type="hidden" name="id" value={subject.id} />
                <input name="name" defaultValue={subject.name} required className={`flex-1 ${inputClass}`} />
                <button type="submit" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500">
                  Rename
                </button>
              </form>

              {topics.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500">Topics</p>
                  <div className="mt-2 space-y-2">
                    {topics.map((topic) => (
                      <form
                        key={topic.name}
                        action={renameOrMergeTopic}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <input type="hidden" name="subjectId" value={subject.id} />
                        <input type="hidden" name="from" value={topic.name} />
                        <span className="text-slate-300">
                          {topic.name} <span className="text-xs text-slate-500">({topic.count})</span>
                        </span>
                        <span className="text-slate-600">→</span>
                        <input
                          name="to"
                          placeholder="Rename to / merge into…"
                          className={`w-56 ${inputClass}`}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
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
