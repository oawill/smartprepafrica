"use client";

import { useState } from "react";
import Link from "next/link";
import { toCsv } from "@/lib/csv";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  validateBulkUpload,
  commitBulkUpload,
  type BulkRowResult,
} from "@/app/dashboard/admin/questions/upload/actions";

type Step = "upload" | "validate" | "preview" | "confirm" | "report";

const STATUS_TONE: Record<string, BadgeTone> = {
  OK: "success",
  WARNING: "warning",
  ERROR: "danger",
};

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BulkUploadWizard({ templateCsv }: { templateCsv: string }) {
  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<BulkRowResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ importedCount: number; skippedCount: number } | null>(null);

  const errorCount = results.filter((r) => r.status === "ERROR").length;
  const warningCount = results.filter((r) => r.status === "WARNING").length;
  const okCount = results.filter((r) => r.status === "OK").length;

  async function handleFile(file: File) {
    setError(null);
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    setStep("validate");
    setLoading(true);
    try {
      const rows = await validateBulkUpload(text);
      setResults(rows);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed.");
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!csvText) return;
    setLoading(true);
    setError(null);
    try {
      const result = await commitBulkUpload(csvText);
      setResults(result.results);
      setReport({ importedCount: result.importedCount, skippedCount: result.skippedCount });
      setStep("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  function downloadErrorReport() {
    const errorRows = results.filter((r) => r.status === "ERROR");
    const csv = toCsv([
      ["row", "status", "messages", "exam", "subject", "prompt"],
      ...errorRows.map((r) => [r.rowNumber, r.status, r.messages.join(" | "), r.exam, r.subjectName, r.prompt]),
    ]);
    downloadCsv("question-upload-errors.csv", csv);
  }

  function reset() {
    setStep("upload");
    setCsvText(null);
    setFileName(null);
    setResults([]);
    setReport(null);
    setError(null);
  }

  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "1. Upload" },
    { key: "validate", label: "2. Validate" },
    { key: "preview", label: "3-4. Preview & resolve" },
    { key: "confirm", label: "5. Confirm" },
    { key: "report", label: "6. Import report" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step || (step === "confirm" && s.key === "preview"));

  return (
    <div>
      <div className="flex flex-wrap gap-2 text-xs">
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={`rounded-full px-3 py-1 ${
              i <= currentIndex ? "bg-brand/10 text-brand-text" : "bg-surface-raised text-text-muted"
            }`}
          >
            {s.label}
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
          <button
            type="button"
            onClick={() => downloadCsv("question-upload-template.csv", templateCsv)}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
          >
            Download CSV template
          </button>
          <div>
            <label className="block text-sm text-text-secondary">Upload a filled-in CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="mt-2 text-sm text-text-secondary"
            />
          </div>
        </div>
      )}

      {step === "validate" && loading && (
        <p className="mt-6 text-sm text-text-secondary">Validating {fileName}…</p>
      )}

      {(step === "preview" || step === "confirm") && !loading && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-success">{okCount} ready</span>
            <span className="text-warning">{warningCount} warnings</span>
            <span className="text-danger">{errorCount} errors (will be skipped)</span>
          </div>

          <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-raised text-xs text-text-muted">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Subject / exam</th>
                  <th className="px-3 py-2">Question text</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-border hover:bg-surface-sunken/50">
                    <td className="px-3 py-2 text-text-muted">{r.rowNumber}</td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {r.subjectName} · {r.exam}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-text-secondary">{r.prompt}</td>
                    <td className="px-3 py-2 text-xs text-text-muted">{r.messages.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {errorCount > 0 && (
              <button
                type="button"
                onClick={downloadErrorReport}
                className="rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger hover:border-danger"
              >
                Download error report
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Start over
            </button>
            <button
              type="button"
              disabled={okCount + warningCount === 0 || loading}
              onClick={() => {
                setStep("confirm");
                handleImport();
              }}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? "Importing…" : `Import ${okCount + warningCount} question(s) as drafts`}
            </button>
          </div>
        </div>
      )}

      {step === "report" && report && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-success/30 bg-success-surface px-4 py-3 text-sm text-success">
            Imported {report.importedCount} question(s) as drafts. Skipped {report.skippedCount} row(s) with errors.
          </div>
          <div className="flex flex-wrap gap-2">
            {errorCount > 0 && (
              <button
                type="button"
                onClick={downloadErrorReport}
                className="rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger hover:border-danger"
              >
                Download error report
              </button>
            )}
            <Link
              href="/dashboard/admin/questions?status=DRAFT"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Review imported drafts →
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
