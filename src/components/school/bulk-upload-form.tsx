"use client";

import { useActionState } from "react";
import { bulkUploadStudents, type BulkUploadResult } from "@/app/dashboard/school/actions";

const initialState: BulkUploadResult = { created: [], skipped: [] };

export function BulkUploadForm({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(bulkUploadStudents, initialState);

  return (
    <div>
      <form action={formAction} className="space-y-3">
        <div>
          <label className="block text-sm text-slate-300" htmlFor="csvFile">
            Student roster CSV (columns: name,email)
          </label>
          <input
            id="csvFile"
            name="csvFile"
            type="file"
            accept=".csv,text/csv"
            required
            className="mt-1 w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:text-slate-200"
          />
        </div>
        {classes.length > 0 && (
          <div>
            <label className="block text-sm text-slate-300" htmlFor="classId">
              Assign to class (optional)
            </label>
            <select
              id="classId"
              name="classId"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="">No class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400 disabled:opacity-60"
        >
          {isPending ? "Uploading…" : "Upload roster"}
        </button>
      </form>

      {(state.created.length > 0 || state.skipped.length > 0) && (
        <div className="mt-4 space-y-3">
          {state.created.length > 0 && (
            <div>
              <p className="text-sm font-medium text-green-400">
                {state.created.length} account{state.created.length === 1 ? "" : "s"} created.
                Copy these temporary passwords now — they won&apos;t be shown again, and no
                invitation email was sent (email sending isn&apos;t configured yet).
              </p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800 text-xs text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Temporary password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.created.map((row) => (
                      <tr key={row.email} className="border-t border-slate-800">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-slate-400">{row.email}</td>
                        <td className="px-3 py-2 font-mono text-orange-300">
                          {row.tempPassword}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {state.skipped.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-400">
                {state.skipped.length} row{state.skipped.length === 1 ? "" : "s"} skipped.
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
                {state.skipped.map((row, i) => (
                  <li key={i}>
                    Row {row.row} ({row.email || "no email"}): {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
