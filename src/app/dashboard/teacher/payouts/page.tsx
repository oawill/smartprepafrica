import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatNaira, getTeacherPayoutSettings } from "@/lib/teachers/compensation";
import { requestTeacherPayout, updatePayoutDestination } from "@/app/dashboard/teacher/payouts/actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  PAID: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export default async function TeacherPayoutsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) redirect("/dashboard");

  const settings = await getTeacherPayoutSettings();

  const [availableAgg, payouts] = await Promise.all([
    prisma.teacherCommission.aggregate({
      where: { teacherId: teacher.id, status: "AVAILABLE", payoutId: null },
      _sum: { amountKobo: true },
    }),
    prisma.teacherPayout.findMany({
      where: { teacherId: teacher.id },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  const availableKobo = availableAgg._sum.amountKobo ?? 0;
  const canRequest = availableKobo >= settings.minimumPayoutKobo;
  const hasPendingRequest = payouts.some((p) => p.status === "REQUESTED" || p.status === "APPROVED");
  const hasDestination = !!teacher.bankAccountNumber;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Payouts</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Earn {formatNaira(settings.commissionPerEnrollmentKobo)} every time a paying student
        enrolls in one of your subscription courses.
      </p>

      <div className="mt-6">
        <Card title="Payout destination">
          <form action={updatePayoutDestination} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="bankName">
                Bank name
              </label>
              <input
                id="bankName"
                name="bankName"
                defaultValue={teacher.bankName ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="bankAccountName">
                Account name
              </label>
              <input
                id="bankAccountName"
                name="bankAccountName"
                defaultValue={teacher.bankAccountName ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="bankAccountNumber">
                Account number
              </label>
              <input
                id="bankAccountNumber"
                name="bankAccountNumber"
                defaultValue={teacher.bankAccountNumber ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Save
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Request a payout">
          <p className="text-sm text-text-secondary">
            Available balance: <span className="text-text-primary">{formatNaira(availableKobo)}</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Minimum payout: {formatNaira(settings.minimumPayoutKobo)}
          </p>

          {!hasDestination ? (
            <p className="mt-3 text-sm text-warning">
              Add your bank details above before requesting a payout.
            </p>
          ) : hasPendingRequest ? (
            <p className="mt-3 text-sm text-warning">
              You already have a payout request being processed.
            </p>
          ) : (
            <form action={requestTeacherPayout} className="mt-3">
              <input type="hidden" name="method" value={teacher.preferredPaymentMethod ?? "BANK_TRANSFER"} />
              <button
                type="submit"
                disabled={!canRequest}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Request payout
              </button>
              {!canRequest && (
                <p className="mt-2 text-xs text-text-muted">
                  You need at least {formatNaira(settings.minimumPayoutKobo)} available.
                </p>
              )}
            </form>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Payout history">
          {payouts.length === 0 ? (
            <p className="text-sm text-text-secondary">No payouts requested yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2">Payout</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Requested</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-surface-sunken/50">
                    <td className="py-2 font-mono text-xs text-text-primary">{p.payoutNumber}</td>
                    <td className="py-2 text-text-primary">{formatNaira(p.amountKobo)}</td>
                    <td className="py-2 text-text-secondary">{p.method}</td>
                    <td className="py-2">
                      <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                    </td>
                    <td className="py-2 text-text-secondary">
                      {new Date(p.requestedAt).toLocaleDateString("en-NG")}
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
