"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { BulkResultBanner } from "@/components/admin/bulk-result-banner";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { bulkApproveLessons, bulkPublishLessons } from "@/app/dashboard/admin/learning/lessons/actions";
import type { BulkAction, BulkResult } from "@/lib/admin/bulk-types";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "warning",
  UNDER_REVIEW: "warning",
  APPROVED: "info",
  PUBLISHED: "success",
  REJECTED: "danger",
  NEEDS_CHANGES: "warning",
  SUSPENDED: "danger",
};

export type BulkLessonRow = {
  id: string;
  title: string;
  type: string;
  courseTitle: string;
  topic: string | null;
  status: string;
};

export function LessonBulkTable({
  lessons,
  canApprove,
  canPublish,
}: {
  lessons: BulkLessonRow[];
  canApprove: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ result: BulkResult; label: string } | null>(null);

  const allSelected = lessons.length > 0 && lessons.every((l) => selected.has(l.id));
  const canBulkUpdate = canApprove || canPublish;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(lessons.map((l) => l.id))));
  }

  const actions: BulkAction[] = [
    ...(canApprove
      ? [
          {
            key: "approve",
            label: "Approve selected",
            confirmMessage: (n: number) =>
              `You are about to approve ${n} lesson${n === 1 ? "" : "s"}. Are you sure you want to continue?`,
            run: (ids: string[]) => bulkApproveLessons(ids),
          } satisfies BulkAction,
        ]
      : []),
    ...(canPublish
      ? [
          {
            key: "publish",
            label: "Publish selected",
            confirmMessage: (n: number) =>
              `You are about to publish ${n} lesson${n === 1 ? "" : "s"}. Only lessons currently Approved will be published — others will be reported as skipped. Continue?`,
            run: (ids: string[]) => bulkPublishLessons(ids),
          } satisfies BulkAction,
        ]
      : []),
  ];

  return (
    <div>
      {result && <BulkResultBanner result={result.result} onDismiss={() => setResult(null)} />}

      {canBulkUpdate && (
        <BulkActionBar
          selectedIds={Array.from(selected)}
          actions={actions}
          onClear={() => setSelected(new Set())}
          onDone={(bulkResult, action) => {
            setResult({ result: bulkResult, label: action.label });
            setSelected(new Set());
            router.refresh();
          }}
        />
      )}

      <table className="w-full text-left text-sm">
        <thead className="text-xs text-text-muted">
          <tr>
            {canBulkUpdate && (
              <th className="w-8 pb-2">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-border-strong bg-surface"
                />
              </th>
            )}
            <th className="pb-2">Lesson</th>
            <th className="pb-2">Course</th>
            <th className="pb-2">Type</th>
            <th className="pb-2">Topic</th>
            <th className="pb-2">Status</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson) => (
            <tr key={lesson.id} className="border-t border-border hover:bg-surface-sunken/50">
              {canBulkUpdate && (
                <td className="py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${lesson.title}`}
                    checked={selected.has(lesson.id)}
                    onChange={() => toggle(lesson.id)}
                    className="rounded border-border-strong bg-surface"
                  />
                </td>
              )}
              <td className="py-2 text-text-primary">{lesson.title}</td>
              <td className="py-2 text-text-secondary">{lesson.courseTitle}</td>
              <td className="py-2 text-text-secondary">{lesson.type}</td>
              <td className="py-2 text-text-secondary">{lesson.topic ?? "—"}</td>
              <td className="py-2">
                <Badge tone={STATUS_TONE[lesson.status] ?? "neutral"}>{lesson.status}</Badge>
              </td>
              <td className="py-2 text-right">
                <Link href={`/dashboard/admin/learning/lessons/${lesson.id}`} className="text-xs text-brand-text hover:underline">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
