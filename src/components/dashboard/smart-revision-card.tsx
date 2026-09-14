import Link from "next/link";
import { Card } from "@/components/dashboard/card";

export function SmartRevisionCard({ dueCount, weakestTopic }: { dueCount: number; weakestTopic: string | null }) {
  if (dueCount === 0) return null;

  return (
    <div className="mt-6">
      <Card title="Smart Revision">
        <p className="text-sm text-text-secondary">
          {dueCount} question{dueCount === 1 ? "" : "s"} ready for review
        </p>
        {weakestTopic && (
          <p className="mt-1 text-xs text-text-muted">
            Weakest topic: <span className="text-text-secondary">{weakestTopic}</span>
          </p>
        )}
        <Link
          href="/revision"
          className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Start Revision
        </Link>
      </Card>
    </div>
  );
}
