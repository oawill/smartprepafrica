import type { ExamType } from "@prisma/client";
import type { RecommendedDrill } from "@/lib/practice/readiness-service";
import { startTopicDrill } from "@/app/practice/drills/actions";

export function RecommendedNextStep({ exam, recommendation }: { exam: ExamType; recommendation: RecommendedDrill }) {
  if (!recommendation) return null;

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-text">Recommended Next Step</p>
      <p className="mt-1 text-sm text-text-primary">
        {recommendation.size}-question {recommendation.topic} drill
      </p>
      <p className="mt-1 text-xs text-text-muted">{recommendation.subjectName}</p>
      <form action={startTopicDrill} className="mt-3">
        <input type="hidden" name="exam" value={exam} />
        <input type="hidden" name="subjectId" value={recommendation.subjectId} />
        <input type="hidden" name="topic" value={recommendation.topic} />
        <button
          type="submit"
          className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Start Recommended Drill
        </button>
      </form>
    </div>
  );
}
