"use client";

import { useState } from "react";
import Link from "next/link";
import { toCsv } from "@/lib/csv";
import {
  validateBulkUpload,
  commitBulkUpload,
  type BulkRowResult,
} from "@/app/dashboard/admin/questions/upload/actions";

type Step = "upload" | "validate" | "preview" | "confirm" | "report";

const statusColor: Record<string, string> = {
  OK: "text-green-400",
  WARNING: "text-amber-400",
  ERROR: "text-red-400",
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
              i <= currentIndex ? "bg-orange-500/10 text-orange-400" : "bg-slate-900 text-slate-600"
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-900 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === "upload" && (
        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={() => downloadCsv("question-upload-template.csv", templateCsv)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            Download CSV template
          </button>
          <div>
            <label className="block text-sm text-slate-300">Upload a filled-in CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="mt-2 text-sm text-slate-400"
            />
          </div>
        </div>
      )}

      {step === "validate" && loading && (
        <p className="mt-6 text-sm text-slate-400">Validating {fileName}…</p>
      )}

      {(step === "preview" || step === "confirm") && !loading && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-green-400">{okCount} ready</span>
            <span className="text-amber-400">{warningCount} warnings</span>
            <span className="text-red-400">{errorCount} errors (will be skipped)</span>
          </div>

          <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 text-xs text-slate-500">
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
                  <tr key={r.rowNumber} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-slate-500">{r.rowNumber}</td>
                    <td className={`px-3 py-2 ${statusColor[r.status]}`}>{r.status}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {r.subjectName} · {r.exam}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-300">{r.prompt}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{r.messages.join(" · ")}</td>
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
                className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:border-red-700"
              >
                Download error report
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
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
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400 disabled:opacity-50"
            >
              {loading ? "Importing…" : `Import ${okCount + warningCount} question(s) as drafts`}
            </button>
          </div>
        </div>
      )}

      {step === "report" && report && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-green-900 bg-green-500/5 px-4 py-3 text-sm text-green-400">
            Imported {report.importedCount} question(s) as drafts. Skipped {report.skippedCount} row(s) with errors.
          </div>
          <div className="flex flex-wrap gap-2">
            {errorCount > 0 && (
              <button
                type="button"
                onClick={downloadErrorReport}
                className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:border-red-700"
              >
                Download error report
              </button>
            )}
            <Link
              href="/dashboard/admin/questions?status=DRAFT"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Review imported drafts →
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Upload another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
