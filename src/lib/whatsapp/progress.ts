import { prisma } from "@/lib/prisma";

/** Reads the same underlying tables the student dashboard
 * (src/app/dashboard/student/page.tsx) reads — QuestionResponse,
 * StudentProfile.currentStreakDays, StudentTopicMastery — rather than
 * a parallel WhatsApp-specific analytics system. */
export async function getWhatsAppProgressSummary(userId: string): Promise<string> {
  const [totalAttempted, totalCorrect, studentProfile, topicMastery] = await Promise.all([
    prisma.questionResponse.count({ where: { attempt: { userId }, selectedOption: { not: null } } }),
    prisma.questionResponse.count({ where: { attempt: { userId }, isCorrect: true } }),
    prisma.studentProfile.findUnique({ where: { userId }, select: { currentStreakDays: true } }),
    prisma.studentTopicMastery.findMany({
      where: { userId },
      select: { subjectId: true, subject: { select: { name: true } }, questionsAttempted: true, questionsCorrect: true },
    }),
  ]);

  if (totalAttempted === 0) {
    return `📊 Your SmartPrepAfrica Progress\n\nYou haven't answered any practice questions yet. Reply 1 for Exam Prep to get started!`;
  }

  const accuracy = Math.round((totalCorrect / totalAttempted) * 100);

  const bySubject = new Map<string, { name: string; attempted: number; correct: number }>();
  for (const row of topicMastery) {
    const existing = bySubject.get(row.subjectId) ?? { name: row.subject.name, attempted: 0, correct: 0 };
    existing.attempted += row.questionsAttempted;
    existing.correct += row.questionsCorrect;
    bySubject.set(row.subjectId, existing);
  }

  const subjectAccuracies = [...bySubject.values()]
    .filter((s) => s.attempted >= 3)
    .map((s) => ({ name: s.name, accuracy: Math.round((s.correct / s.attempted) * 100) }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const strongest = subjectAccuracies[0];
  const weakest = subjectAccuracies[subjectAccuracies.length - 1];

  const lines = [
    "📊 Your SmartPrepAfrica Progress",
    "",
    `Questions attempted: ${totalAttempted}`,
    `Correct: ${totalCorrect}`,
    `Overall accuracy: ${accuracy}%`,
    "",
    `🔥 Study streak: ${studentProfile?.currentStreakDays ?? 0} days`,
  ];

  if (strongest) lines.push(`Strongest subject: ${strongest.name} — ${strongest.accuracy}%`);
  if (weakest && weakest.name !== strongest?.name) {
    lines.push(`Needs attention: ${weakest.name} — ${weakest.accuracy}%`);
  }

  lines.push("", "Reply MENU to keep going.");

  return lines.join("\n");
}
