import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { isSatEnabled } from "@/lib/sat/config";

const SECTION_LABEL: Record<string, string> = { READING_WRITING: "Reading & Writing", MATH: "Math" };

export default async function SatDrillHistoryPage() {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/sat/drill/history");
  await requireExamProductEntitlement(session.user.id, "SAT");

  const drills = await prisma.satAttempt.findMany({
    where: { userId: session.user.id, kind: "DRILL", submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    include: { items: { include: { content: { select: { section: true, domain: true, skill: true } } } } },
    take: 50,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/international-exams/sat/drill" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Drills
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Drill History</h1>

      <div className="mt-6">
        <Card title={`${drills.length} completed drill${drills.length === 1 ? "" : "s"}`}>
          {drills.length === 0 ? (
            <p className="text-sm text-text-secondary">No drills completed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Domain / Skill</th>
                    <th className="px-3 py-2">Questions</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Accuracy</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {drills.map((d) => {
                    const total = d.items.length;
                    const correct = d.items.filter((i) => i.isCorrect).length;
                    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
                    const domains = [...new Set(d.items.map((i) => i.content.domain))];
                    const sections = [...new Set(d.items.map((i) => i.content.section))];
                    const durationSec = d.submittedAt
                      ? Math.max(0, Math.round((d.submittedAt.getTime() - d.startedAt.getTime()) / 1000))
                      : 0;
                    return (
                      <tr key={d.id} className="border-t border-border">
                        <td className="px-3 py-2 text-text-muted">{d.submittedAt?.toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-text-secondary">
                          {sections.map((s) => SECTION_LABEL[s] ?? s).join(", ")}
                        </td>
                        <td className="max-w-[12rem] truncate px-3 py-2 text-text-secondary">
                          {domains.slice(0, 2).join(", ")}
                          {domains.length > 2 ? "…" : ""}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">{total}</td>
                        <td className="px-3 py-2 text-text-secondary">
                          {correct}/{total}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">{accuracy}%</td>
                        <td className="px-3 py-2 text-text-muted">
                          {Math.floor(durationSec / 60)}m {durationSec % 60}s
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/international-exams/sat/drill/results/${d.id}`} className="text-brand-text hover:underline">
                            Review →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
