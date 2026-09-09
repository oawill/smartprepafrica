import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import {
  verifyAndActivateSchool,
  requestMoreVerification,
  suspendSchool,
  closeSchool,
} from "@/app/dashboard/admin/schools/actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  VERIFICATION_REQUIRED: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  CLOSED: "neutral",
};

export default async function AdminSchoolsPage() {
  await requireAdminPagePermission("schools.view");

  const schools = await prisma.school.findMany({
    include: { _count: { select: { courses: true, teachers: true, students: true } } },
    orderBy: { createdAt: "desc" },
  });

  const licensePurchases = await prisma.schoolLicensePurchase.findMany({
    where: { status: "SUCCESS" },
    select: { schoolId: true, vouchers: { select: { status: true } } },
  });
  const licenseCountsBySchool = new Map<string, { purchased: number; available: number; redeemed: number }>();
  for (const p of licensePurchases) {
    const counts = licenseCountsBySchool.get(p.schoolId) ?? { purchased: 0, available: 0, redeemed: 0 };
    counts.purchased += p.vouchers.length;
    counts.available += p.vouchers.filter((v) => v.status === "ACTIVE").length;
    counts.redeemed += p.vouchers.filter((v) => v.status === "REDEEMED").length;
    licenseCountsBySchool.set(p.schoolId, counts);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Schools</h1>
      <p className="mt-1 text-sm text-text-secondary">{schools.length} registered.</p>

      <div className="mt-6 space-y-3">
        {schools.map((s) => (
          <Card key={s.id} title={`${s.name} ${s.schoolNumber ? `(${s.schoolNumber})` : ""}`}>
            <p className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>
                {s.state ?? "—"} · {s._count.courses} courses · {s._count.teachers} teachers · {s._count.students} students
              </span>
              <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</Badge>
            </p>
            {s.statusReason && <p className="mt-1 text-xs text-text-muted">Reason on file: {s.statusReason}</p>}
            {licenseCountsBySchool.has(s.id) && (
              <p className="mt-1 text-xs text-text-muted">
                Licenses: {licenseCountsBySchool.get(s.id)!.purchased} purchased ·{" "}
                {licenseCountsBySchool.get(s.id)!.available} available ·{" "}
                {licenseCountsBySchool.get(s.id)!.redeemed} assigned
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {s.status !== "ACTIVE" && (
                <form action={verifyAndActivateSchool}>
                  <input type="hidden" name="schoolId" value={s.id} />
                  <button type="submit" className="rounded-lg border border-success/40 px-3 py-1.5 text-xs text-success hover:border-success">
                    Verify & activate
                  </button>
                </form>
              )}
              <form action={requestMoreVerification} className="flex gap-1">
                <input type="hidden" name="schoolId" value={s.id} />
                <input
                  name="reason"
                  placeholder="What's missing…"
                  className="w-40 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                />
                <button type="submit" className="rounded-lg border border-warning/40 px-3 py-1.5 text-xs text-warning hover:border-warning">
                  Request verification
                </button>
              </form>
              {s.status !== "SUSPENDED" && (
                <form action={suspendSchool} className="flex gap-1">
                  <input type="hidden" name="schoolId" value={s.id} />
                  <input
                    name="reason"
                    placeholder="Reason to suspend…"
                    className="w-40 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                  />
                  <button type="submit" className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:border-danger">
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
                    className="w-40 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                  />
                  <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
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
