import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import {
  verifyAndActivateSchool,
  requestMoreVerification,
  suspendSchool,
  closeSchool,
} from "@/app/dashboard/admin/schools/actions";

const statusColor: Record<string, string> = {
  PENDING: "text-amber-400",
  VERIFICATION_REQUIRED: "text-amber-400",
  ACTIVE: "text-green-400",
  SUSPENDED: "text-red-400",
  CLOSED: "text-slate-600",
};

export default async function AdminSchoolsPage() {
  await requireAdminPagePermission("schools.view");

  const schools = await prisma.school.findMany({
    include: { _count: { select: { courses: true, teachers: true, students: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Schools</h1>
      <p className="mt-1 text-sm text-slate-400">{schools.length} registered.</p>

      <div className="mt-6 space-y-3">
        {schools.map((s) => (
          <Card key={s.id} title={`${s.name} ${s.schoolNumber ? `(${s.schoolNumber})` : ""}`}>
            <p className="text-sm text-slate-400">
              {s.state ?? "—"} · {s._count.courses} courses · {s._count.teachers} teachers · {s._count.students} students ·{" "}
              <span className={statusColor[s.status] ?? ""}>{s.status}</span>
            </p>
            {s.statusReason && <p className="mt-1 text-xs text-slate-500">Reason on file: {s.statusReason}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {s.status !== "ACTIVE" && (
                <form action={verifyAndActivateSchool}>
                  <input type="hidden" name="schoolId" value={s.id} />
                  <button type="submit" className="rounded-lg border border-green-800 px-3 py-1.5 text-xs text-green-400 hover:border-green-600">
                    Verify & activate
                  </button>
                </form>
              )}
              <form action={requestMoreVerification} className="flex gap-1">
                <input type="hidden" name="schoolId" value={s.id} />
                <input
                  name="reason"
                  placeholder="What's missing…"
                  className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-orange-500"
                />
                <button type="submit" className="rounded-lg border border-amber-800 px-3 py-1.5 text-xs text-amber-400 hover:border-amber-600">
                  Request verification
                </button>
              </form>
              {s.status !== "SUSPENDED" && (
                <form action={suspendSchool} className="flex gap-1">
                  <input type="hidden" name="schoolId" value={s.id} />
                  <input
                    name="reason"
                    placeholder="Reason to suspend…"
                    className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-orange-500"
                  />
                  <button type="submit" className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-700">
                    Suspend
                  </button>
                </form>
              )}
              {s.status !== "CLOSED" && (
                <form action={closeSchool} className="flex gap-1">
                  <input type="hidden" name="schoolId" value={s.id} />
                  <input
                    name="reason"
                    placeholder="Reason to close…"
                    className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-orange-500"
                  />
                  <button type="submit" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500">
                    Close
                  </button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
