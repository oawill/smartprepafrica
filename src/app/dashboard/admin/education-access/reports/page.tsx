import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";

// Live, on-screen report only — no PDF export, no saved report history,
// no scheduled generation this pass (see Phase 3 plan's future-ready
// list). Scoped to Sponsor or School, since those are the real entities
// with countable data via the existing Voucher/VoucherRedemption system —
// EducationAccessGrant (Phase 3's outbound fundraising CRM) has no direct
// link to funded students, so it isn't offered as a report scope here.
export default async function AdminFunderReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ sponsorId?: string; schoolId?: string }>;
}) {
  await requireAdminPagePermission("education_access.manage");

  const { sponsorId, schoolId } = await searchParams;

  const [sponsors, schools] = await Promise.all([
    prisma.sponsorProfile.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.school.findMany({
      where: { sponsorshipPrograms: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  let scopeLabel: string | null = null;
  let redeemedUserIds: string[] = [];
  let schoolCount = 0;
  let stateCount = 0;

  if (sponsorId) {
    const sponsor = sponsors.find((s) => s.id === sponsorId);
    scopeLabel = sponsor ? `Sponsor: ${sponsor.user.name ?? sponsor.organization ?? sponsor.id}` : null;
    const redemptions = await prisma.voucherRedemption.findMany({
      where: { voucher: { sponsorId } },
      select: { userId: true },
    });
    redeemedUserIds = redemptions.map((r) => r.userId);
    const programSchools = await prisma.sponsorshipProgram.findMany({
      where: { sponsorId, schoolId: { not: null } },
      select: { schoolId: true },
      distinct: ["schoolId"],
    });
    schoolCount = programSchools.length;
  } else if (schoolId) {
    const school = schools.find((s) => s.id === schoolId);
    scopeLabel = school ? `School: ${school.name}` : null;
    const programs = await prisma.sponsorshipProgram.findMany({
      where: { schoolId },
      select: { id: true },
    });
    const redemptions = await prisma.voucherRedemption.findMany({
      where: { voucher: { programId: { in: programs.map((p) => p.id) } } },
      select: { userId: true },
    });
    redeemedUserIds = redemptions.map((r) => r.userId);
    schoolCount = 1;
  }

  const hasScope = redeemedUserIds.length >= 0 && scopeLabel !== null;

  const [lessonsCompleted, examAttempts, certificates] = hasScope
    ? await Promise.all([
        prisma.lessonProgress.count({
          where: { enrollment: { userId: { in: redeemedUserIds } }, completedAt: { not: null } },
        }),
        prisma.examAttempt.count({ where: { userId: { in: redeemedUserIds }, submittedAt: { not: null } } }),
        prisma.certificate.count({ where: { userId: { in: redeemedUserIds } } }),
      ])
    : [0, 0, 0];

  if (hasScope && sponsorId) {
    const stateRows = await prisma.school.findMany({
      where: { sponsorshipPrograms: { some: { sponsorId } }, state: { not: null } },
      select: { state: true },
      distinct: ["state"],
    });
    stateCount = stateRows.length;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Funder Reports</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Real, current data for a specific sponsor or school — no PDF export or saved report
        history yet. Program highlights, challenges, and next steps are prepared by SmartPrepAfrica
        staff for each report shared with a partner, based on this data.
      </p>

      <div className="mt-6">
        <Card title="Choose a scope">
          <form className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-text-secondary">Sponsor</label>
              <select
                name="sponsorId"
                defaultValue={sponsorId ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                <option value="">— None —</option>
                {sponsors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user.name ?? s.organization ?? s.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary">School</label>
              <select
                name="schoolId"
                defaultValue={schoolId ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                <option value="">— None —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
              >
                View report
              </button>
            </div>
          </form>
        </Card>
      </div>

      {scopeLabel && (
        <div className="mt-6">
          <Card title={scopeLabel}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Students Supported</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{redeemedUserIds.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Schools Supported</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{schoolCount}</p>
              </div>
              {sponsorId && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">States Reached</p>
                  <p className="mt-1 text-2xl font-semibold text-text-primary">{stateCount}</p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Lessons Completed</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{lessonsCompleted}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Exam Practice Sessions</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{examAttempts}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Certificates Earned</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{certificates}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
