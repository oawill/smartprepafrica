"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MessageContent } from "@/components/ai-coach/message-content";
import { AnswerOption } from "@/components/exam/answer-option";
import type { NormalizedImportRow } from "@/lib/admin/content-import/normalize";
import {
  prepareContentSetsAction,
  importBatchChunkAction,
  publishBatchAction,
} from "@/app/dashboard/admin/content-import/actions";
import { getPreviewRowsAction } from "@/app/dashboard/admin/content-import/actions";

type Step = "upload" | "validating" | "preview" | "importing" | "done";
type Exam = "SAT" | "TOEFL";
type Format = "CSV" | "XLSX" | "JSON";

type ValidationSummary = {
  totalRecords: number;
  validRecords: number;
  warningRecords: number;
  errorRecords: number;
  duplicateRecords: number;
};

function detectFormat(file: File): Format {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return "XLSX";
  if (name.endsWith(".json")) return "JSON";
  return "CSV";
}

export function ContentImportWizard() {
  const [exam, setExam] = useState<Exam>("SAT");
  const [step, setStep] = useState<Step>("upload");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [previewRows, setPreviewRows] = useState<NormalizedImportRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setStep("validating");
    try {
      const format = detectFormat(file);
      const formData = new FormData();
      formData.append("exam", exam);
      formData.append("format", format);
      formData.append("file", file);

      const uploadRes = await fetch("/api/admin/content-import/upload", { method: "POST", body: formData });
      const uploadBody = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadBody.error ?? "Upload failed.");

      const newBatchId = uploadBody.batchId as string;
      setBatchId(newBatchId);

      const validateRes = await fetch(`/api/admin/content-import/${newBatchId}/validate`, { method: "POST" });
      const validateBody = await validateRes.json();
      if (!validateRes.ok) throw new Error(validateBody.error ?? "Validation failed.");
      setSummary(validateBody);

      const rows = await getPreviewRowsAction(newBatchId);
      setPreviewRows(rows);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("upload");
    }
  }

  async function handleImport() {
    if (!batchId || !summary) return;
    setStep("importing");
    setError(null);
    try {
      await prepareContentSetsAction(batchId);
      let cursor: string | null = null;
      let total = 0;
      // Sequential, client-driven, resumable chunk loop — deliberately not
      // parallel (avoids DB connection-pool contention) and survives a
      // single request timing out, since each chunk call picks up where
      // the last one left off.
      for (;;) {
        const result = await importBatchChunkAction(batchId, cursor);
        total += result.importedInChunk;
        setImportedCount(total);
        if (result.done) break;
        cursor = result.nextCursor;
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed partway through — you can safely retry.");
    }
  }

  async function handlePublish() {
    if (!batchId) return;
    const formData = new FormData();
    formData.append("batchId", batchId);
    await publishBatchAction(formData);
    setPublished(true);
  }

  function reset() {
    setStep("upload");
    setBatchId(null);
    setSummary(null);
    setPreviewRows([]);
    setImportedCount(0);
    setError(null);
    setPublished(false);
  }

  const importableCount = summary ? summary.validRecords + summary.warningRecords : 0;

  return (
    <div>
      <div className="flex flex-wrap gap-2 text-xs">
        {(["upload", "validating", "preview", "importing", "done"] as Step[]).map((s, i, arr) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 capitalize ${
              arr.indexOf(step) >= i ? "bg-brand/10 text-brand-text" : "bg-surface-raised text-text-muted"
            }`}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger-surface px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {step === "upload" && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary">Exam</label>
            <div className="mt-2 flex gap-2">
              {(["SAT", "TOEFL"] as Exam[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setExam(e)}
                  className={`rounded-full px-4 py-1.5 text-sm ${
                    exam === e ? "bg-brand text-brand-foreground" : "border border-border-strong text-text-secondary"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["CSV", "XLSX", "JSON"] as Format[]).map((f) => (
              <a
                key={f}
                href={`/api/admin/content-import/template?exam=${exam}&format=${f}`}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
              >
                Download {f} template
              </a>
            ))}
          </div>

          <div>
            <label className="block text-sm text-text-secondary">Upload a {exam} question file (CSV, XLSX, or JSON)</label>
            <input
              type="file"
              accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="mt-2 text-sm text-text-secondary"
            />
          </div>
        </div>
      )}

      {step === "validating" && <p className="mt-6 text-sm text-text-secondary">Parsing and validating…</p>}

      {step === "preview" && summary && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-text-primary">Total: {summary.totalRecords}</span>
            <span className="text-success">Valid: {summary.validRecords}</span>
            <span className="text-warning">Warnings: {summary.warningRecords}</span>
            <span className="text-danger">Errors: {summary.errorRecords}</span>
            <span className="text-text-muted">Duplicates: {summary.duplicateRecords}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(summary.errorRecords > 0 || summary.warningRecords > 0 || summary.duplicateRecords > 0) && batchId && (
              <a
                href={`/api/admin/content-import/${batchId}/error-report`}
                className="rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger hover:border-danger"
              >
                Download error report
              </a>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Start over
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-text-primary">Preview — first {previewRows.length} valid questions, exactly as students will see them</p>
            <div className="mt-3 max-h-[32rem] space-y-4 overflow-y-auto rounded-xl border border-border p-4">
              {previewRows.map((row, i) => (
                <div key={i} className="rounded-lg border border-border-strong bg-surface-raised p-4">
                  <div className="mb-2 flex flex-wrap gap-2 text-xs text-text-muted">
                    <Badge tone="neutral">{row.section}</Badge>
                    {row.domain && <Badge tone="neutral">{row.domain}</Badge>}
                    {row.difficulty && <Badge tone="neutral">{row.difficulty}</Badge>}
                  </div>
                  {row.passageText && <MessageContent content={row.passageText} />}
                  <div className="mt-2">
                    <MessageContent content={row.prompt} />
                  </div>
                  {row.options.length > 0 && (
                    <div className="mt-3 space-y-2" role="list">
                      {row.options.map((o) => (
                        <AnswerOption key={o.key} optionKey={o.key} state={o.key === row.correctOption ? "correct" : "default"}>
                          {o.text}
                        </AnswerOption>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {previewRows.length === 0 && (
                <p className="text-sm text-text-secondary">No valid rows to preview.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={importableCount === 0}
            onClick={handleImport}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            Import {importableCount} question(s) as drafts
          </button>
        </div>
      )}

      {step === "importing" && (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-text-secondary">
            Importing… {importedCount} of {importableCount} so far.
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${importableCount ? Math.min(100, (importedCount / importableCount) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {step === "done" && batchId && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-success/30 bg-success-surface px-4 py-3 text-sm text-success">
            Imported {importedCount} question(s) as drafts.
          </div>
          <div className="flex flex-wrap gap-2">
            {!published ? (
              <button
                type="button"
                onClick={handlePublish}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Publish this batch
              </button>
            ) : (
              <Badge tone="success">Published</Badge>
            )}
            <Link
              href={`/dashboard/admin/content-import/${batchId}`}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              View batch →
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Upload another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
