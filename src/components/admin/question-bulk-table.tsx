"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { BulkResultBanner } from "@/components/admin/bulk-result-banner";
import { bulkArchiveQuestions, bulkPublishQuestions } from "@/app/dashboard/admin/questions/actions";
import type { BulkAction, BulkResult } from "@/lib/admin/bulk-types";

const statusColor: Record<string, string> = {
  DRAFT: "text-slate-400",
  NEEDS_REVIEW: "text-amber-400",
  APPROVED: "text-blue-400",
  PUBLISHED: "text-green-400",
  ARCHIVED: "text-slate-600",
};

export type BulkQuestionRow = {
  id: string;
  questionNumber: string | null;
  subjectName: string;
  exam: string;
  topic: string | null;
  difficulty: string;
  status: string;
  duplicateOfId: string | null;
};

export function QuestionBulkTable({
  questions,
  canArchive,
  canPublish,
}: {
  questions: BulkQuestionRow[];
  canArchive: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ result: BulkResult; label: string } | null>(null);

  const allSelected = questions.length > 0 && questions.every((q) => selected.has(q.id));
  const canBulkUpdate = canArchive || canPublish;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(questions.map((q) => q.id))));
  }

  const actions: BulkAction[] = [
    ...(canPublish
      ? [
          {
            key: "publish",
            label: "Publish selected",
            confirmMessage: (n: number) => `You are about to publish ${n} record${n === 1 ? "" : "s"}. Only questions currently Approved will be published — others will be reported as skipped. Continue?`,
            run: (ids: string[]) => bulkPublishQuestions(ids),
          } satisfies BulkAction,
        ]
      : []),
    ...(canArchive
      ? [
          {
            key: "archive",
            label: "Archive selected",
            danger: true,
            confirmMessage: (n: number) => `You are about to archive ${n} record${n === 1 ? "" : "s"}. Continue?`,
            run: (ids: string[]) => bulkArchiveQuestions(ids),
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
        <thead className="text-xs text-slate-500">
          <tr>
            {canBulkUpdate && (
              <th className="w-8 pb-2">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-slate-600 bg-slate-950"
                />
              </th>
            )}
            <th className="pb-2">ID</th>
            <th className="pb-2">Subject / exam</th>
            <th className="pb-2">Topic</th>
            <th className="pb-2">Difficulty</th>
            <th className="pb-2">Status</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id} className="border-t border-slate-800">
              {canBulkUpdate && (
                <td className="py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${question.questionNumber ?? question.id}`}
                    checked={selected.has(question.id)}
                    onChange={() => toggle(question.id)}
                    className="rounded border-slate-600 bg-slate-950"
                  />
                </td>
              )}
              <td className="py-2 font-mono text-xs text-slate-500">{question.questionNumber ?? "—"}</td>
              <td className="py-2 text-slate-300">
                {question.subjectName} · {question.exam}
              </td>
              <td className="py-2 text-slate-400">{question.topic ?? "—"}</td>
              <td className="py-2 text-slate-400">{question.difficulty}</td>
              <td className={`py-2 ${statusColor[question.status] ?? ""}`}>
                {question.status}
                {question.duplicateOfId && (
                  <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                    possible duplicate
                  </span>
                )}
              </td>
              <td className="py-2 text-right">
                <Link href={`/dashboard/admin/questions/${question.id}`} className="text-xs text-orange-400 hover:underline">
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
