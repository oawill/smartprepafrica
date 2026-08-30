import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { createExamBody, createExam, setCountryExamStatus } from "@/app/dashboard/admin/exams/actions";

const inputClass =
  "rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  CONTENT_SETUP: "info",
  TESTING: "warning",
  ACTIVE: "success",
  PAUSED: "danger",
};

const STATUSES = ["DRAFT", "CONTENT_SETUP", "TESTING", "ACTIVE", "PAUSED"] as const;

export default async function AdminExamsPage() {
  await requireAdminPagePermission("exams.manage");

  const [examBodies, exams, countries, countryExams] = await Promise.all([
    prisma.examBody.findMany({ orderBy: { name: "asc" } }),
    prisma.exam.findMany({ orderBy: { name: "asc" }, include: { examBody: true } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.countryExam.findMany(),
  ]);

  const statusByCountryExam = new Map(countryExams.map((ce) => [`${ce.countryId}:${ce.examId}`, ce]));

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Exam bodies & exams</h1>
      <p className="mt-1 text-sm text-text-secondary">
        An Exam Body (e.g. WAEC) administers one or more Exams (e.g. WASSCE) — the same Exam can be
        activated for several countries without duplicating it.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card title="Add exam body">
          <form action={createExamBody} className="flex gap-2">
            <input name="name" placeholder="Name, e.g. WAEC" required className={`flex-1 ${inputClass}`} />
            <input name="code" placeholder="Code" required className={`w-28 ${inputClass}`} />
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Add
            </button>
          </form>
        </Card>

        <Card title="Add exam">
          <form action={createExam} className="flex flex-wrap gap-2">
            <input name="name" placeholder="Name, e.g. WASSCE" required className={`flex-1 ${inputClass}`} />
            <input name="code" placeholder="Code" required className={`w-28 ${inputClass}`} />
            <select name="examBodyId" required className={inputClass}>
              <option value="">Exam body…</option>
              {examBodies.map((body) => (
                <option key={body.id} value={body.id}>
                  {body.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Add
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {exams.map((exam) => (
          <Card key={exam.id} title={`${exam.name} (${exam.examBody.name})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th className="pb-2 pr-3">Country</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2">Change status</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((country) => {
                    const countryExam = statusByCountryExam.get(`${country.id}:${exam.id}`);
                    return (
                      <tr key={country.id} className="border-t border-border">
                        <td className="py-2 pr-3 text-text-primary">
                          {country.flag} {country.name}
                        </td>
                        <td className="py-2 pr-3">
                          {countryExam ? (
                            <Badge tone={STATUS_TONE[countryExam.status]}>
                              {countryExam.status.replaceAll("_", " ")}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">Not offered</Badge>
                          )}
                        </td>
                        <td className="py-2">
                          <form action={setCountryExamStatus} className="flex gap-2">
                            <input type="hidden" name="countryId" value={country.id} />
                            <input type="hidden" name="examId" value={exam.id} />
                            <select name="status" defaultValue={countryExam?.status ?? "DRAFT"} className={inputClass}>
                              {STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
                            >
                              {countryExam ? "Update" : "Activate"}
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
