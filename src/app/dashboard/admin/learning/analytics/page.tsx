import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";

/** Aggregate rollups over existing tables only — no new event-log
 * infrastructure this pass (none exists in the app today, and the MVP
 * acceptance test doesn't need one). */
export default async function LearningAnalyticsPage() {
  await requireAdminPagePermission("analytics.view");

  const [
    publishedLessonCount,
    videoLessonCount,
    totalEnrollments,
    completedProgressCount,
    totalProgressRows,
    avgWatchedRow,
    masteryBySubject,
  ] = await Promise.all([
    prisma.lesson.count({ where: { moderationStatus: "PUBLISHED" } }),
    prisma.lesson.count({ where: { moderationStatus: "PUBLISHED", type: "VIDEO" } }),
    prisma.courseEnrollment.count(),
    prisma.lessonProgress.count({ where: { completedAt: { not: null } } }),
    prisma.lessonProgress.count(),
    prisma.lessonProgress.aggregate({ _avg: { percentWatched: true } }),
    prisma.studentTopicMastery.groupBy({
      by: ["subjectId"],
      _avg: { masteryScore: true },
      _count: true,
    }),
  ]);

  const subjects = await prisma.subject.findMany({
    where: { id: { in: masteryBySubject.map((m) => m.subjectId) } },
    select: { id: true, name: true },
  });
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

  const weakestTopics = await prisma.studentTopicMastery.groupBy({
    by: ["topic", "subjectId"],
    where: { confidenceScore: { gt: 0.15 } },
    _avg: { masteryScore: true },
    _count: true,
    orderBy: { _avg: { masteryScore: "asc" } },
    take: 10,
  });

  const completionRate = totalProgressRows > 0 ? (completedProgressCount / totalProgressRows) * 100 : 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Learning analytics</h1>
      <p className="mt-1 text-sm text-slate-400">
        Aggregate rollups over enrollment, watch-progress, and mastery data.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Published lessons">
          <p className="text-3xl font-semibold">{publishedLessonCount}</p>
          <p className="mt-1 text-xs text-slate-500">{videoLessonCount} video</p>
        </Card>
        <Card title="Total enrollments">
          <p className="text-3xl font-semibold">{totalEnrollments}</p>
        </Card>
        <Card title="Lesson completion rate">
          <p className="text-3xl font-semibold">{Math.round(completionRate)}%</p>
          <p className="mt-1 text-xs text-slate-500">{completedProgressCount} of {totalProgressRows} started lessons</p>
        </Card>
        <Card title="Average video watched">
          <p className="text-3xl font-semibold">
            {avgWatchedRow._avg.percentWatched !== null ? `${Math.round(avgWatchedRow._avg.percentWatched)}%` : "—"}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Average mastery by subject">
          {masteryBySubject.length === 0 ? (
            <p className="text-sm text-slate-500">No mastery data yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {masteryBySubject
                .sort((a, b) => (b._avg.masteryScore ?? 0) - (a._avg.masteryScore ?? 0))
                .map((m) => (
                  <li key={m.subjectId} className="flex justify-between text-slate-300">
                    <span>{subjectNameById.get(m.subjectId) ?? m.subjectId}</span>
                    <span className="text-slate-500">
                      {Math.round(m._avg.masteryScore ?? 0)}% · {m._count} students
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card title="Weakest concepts platform-wide">
          {weakestTopics.length === 0 ? (
            <p className="text-sm text-slate-500">No mastery data yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {weakestTopics.map((t) => (
                <li key={`${t.subjectId}-${t.topic}`} className="flex justify-between text-slate-300">
                  <span>{t.topic}</span>
                  <span className="text-slate-500">
                    {Math.round(t._avg.masteryScore ?? 0)}% · {t._count} students
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
