import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatNaira, getTeacherPayoutSettings } from "@/lib/teachers/compensation";
import {
  approveTeacherPayout,
  markTeacherPayoutPaid,
  rejectTeacherPayout,
  updateTeacherPayoutSettings,
} from "@/app/dashboard/admin/teacher-payouts/actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  PAID: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export default async function AdminTeacherPayoutsPage() {
  await requireAdminPagePermission("teachers.payout");

  const [settings, payouts, recent] = await Promise.all([
    getTeacherPayoutSettings(),
    prisma.teacherPayout.findMany({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
      include: { teacher: { select: { user: { select: { name: true } } } } },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.teacherPayout.findMany({
      where: { status: { in: ["PAID", "REJECTED"] } },
      include: { teacher: { select: { user: { select: { name: true } } } } },
      orderBy: { requestedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Teacher payouts</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Review and process payout requests. Payouts are only marked paid once you confirm the
        transfer actually happened.
      </p>

      <div className="mt-6">
        <Card title="Commission settings">
          <form action={updateTeacherPayoutSettings} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="commissionPerEnrollmentNaira">
                Commission per paid enrollment (₦)
              </label>
              <input
                id="commissionPerEnrollmentNaira"
                name="commissionPerEnrollmentNaira"
                type="number"
                min={0}
                step="0.01"
                defaultValue={settings.commissionPerEnrollmentKobo / 100}
                className="mt-1 w-40 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="minimumPayoutNaira">
                Minimum payout (₦)
              </label>
              <input
                id="minimumPayoutNaira"
                name="minimumPayoutNaira"
                type="number"
                min={0}
                step="0.01"
                defaultValue={settings.minimumPayoutKobo / 100}
                className="mt-1 w-40 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Save
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Pending (${payouts.length})`}>
          {payouts.length === 0 ? (
            <p className="text-sm text-text-secondary">No pending payout requests.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-text-primary">
                        {p.payoutNumber} · {formatNaira(p.amountKobo)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {p.teacher.user.name} · {p.method}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.status === "REQUESTED" && (
                      <form action={approveTeacherPayout}>
                        <input type="hidden" name="payoutId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-info/40 px-3 py-1 text-xs text-info hover:border-info"
                        >
                          Approve
                        </button>
                      </form>
                    )}
                    {p.status === "APPROVED" && (
                      <form action={markTeacherPayoutPaid}>
                        <input type="hidden" name="payoutId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-success/40 px-3 py-1 text-xs text-success hover:border-success"
                        >
                          Mark paid
                        </button>
                      </form>
                    )}
                    <form action={rejectTeacherPayout} className="flex items-center gap-2">
                      <input type="hidden" name="payoutId" value={p.id} />
                      <input
                        name="reason"
                        placeholder="Rejection reason"
                        className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-danger/40 px-3 py-1 text-xs text-danger hover:border-danger"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Recent history">
          {recent.length === 0 ? (
            <p className="text-sm text-text-secondary">No processed payouts yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2">Payout</th>
                  <th className="pb-2">Teacher</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs text-text-primary">{p.payoutNumber}</td>
                    <td className="py-2 text-text-secondary">{p.teacher.user.name}</td>
                    <td className="py-2 text-text-primary">{formatNaira(p.amountKobo)}</td>
                    <td className="py-2">
                      <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
