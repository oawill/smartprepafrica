import type { ExamType } from "@prisma/client";

function daysUntil(date: Date): number {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function ExamCountdown({ exam, examLabel, examDate }: { exam: ExamType; examLabel: string; examDate: Date }) {
  const days = daysUntil(examDate);
  if (days < 0) return null;

  return (
    <span
      key={exam}
      className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand-text"
    >
      {days === 0 ? `${examLabel} is today` : `${days} day${days === 1 ? "" : "s"} until ${examLabel}`}
    </span>
  );
}
