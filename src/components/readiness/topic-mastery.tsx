import type { ExamType } from "@prisma/client";
import type { TopicMasteryRow } from "@/lib/practice/readiness-service";
import { TOPIC_STATUS_LABEL } from "@/lib/practice/readiness-service";
import { Badge } from "@/components/ui/badge";
import { TOPIC_STATUS_TONE } from "@/components/readiness/status-meta";
import { startTopicDrill } from "@/app/practice/drills/actions";

export function TopicMastery({
  exam,
  subjectId,
  subjectName,
  topics,
}: {
  exam: ExamType;
  subjectId: string;
  subjectName: string;
  topics: TopicMasteryRow[];
}) {
  if (topics.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
        No topic data yet for {subjectName}. Practice a few questions to see your topic breakdown.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <h3 className="font-semibold text-text-primary">{subjectName}</h3>
      <ul className="mt-3 divide-y divide-border">
        {topics.map((topic) => (
          <li key={topic.topic} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{topic.topic}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {topic.masteryScore}% — {TOPIC_STATUS_LABEL[topic.status]}
              </p>
            </div>
            <Badge tone={TOPIC_STATUS_TONE[topic.status]}>{TOPIC_STATUS_LABEL[topic.status]}</Badge>
            {topic.status !== "NOT_ENOUGH_DATA" && (
              <form action={startTopicDrill}>
                <input type="hidden" name="exam" value={exam} />
                <input type="hidden" name="subjectId" value={subjectId} />
                <input type="hidden" name="topic" value={topic.topic} />
                <button
                  type="submit"
                  className="shrink-0 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-primary hover:border-brand hover:text-brand-text"
                >
                  Practice
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
