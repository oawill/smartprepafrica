import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { refundPayment } from "@/app/dashboard/admin/finance/actions";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 30;

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(
    kobo / 100
  );
}

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  SUCCESS: "success",
  FAILED: "danger",
};

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; page?: string }>;
}) {
  await requireAdminPagePermission("payments.view");
  const { status, kind, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const where: Prisma.PaymentWhereInput = {
    ...(status ? { status: status as never } : {}),
    ...(kind ? { kind: kind as never } : {}),
  };

  const [total, payments, refundedIds] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.payment.findMany({ where: { kind: "REFUND" }, select: { reversalOfId: true } }),
  ]);

  const refundedSet = new Set(refundedIds.map((r) => r.reversalOfId));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Finance — Transactions</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {total} transactions. Refunds create a new ledger row rather than editing history.
      </p>

      <div className="mt-6">
        <Card title="Filter">
          <form className="flex gap-2">
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              <option value="">Any status</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
            <select
              name="kind"
              defaultValue={kind ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              <option value="">Charges & refunds</option>
              <option value="CHARGE">Charges only</option>
              <option value="REFUND">Refunds only</option>
            </select>
            <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
              Filter
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${payments.length} on this page`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr>
                <th className="pb-2">Reference</th>
                <th className="pb-2">User</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Provider</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-sunken/50">
                  <td className="py-2 font-mono text-xs text-text-muted">{p.transactionNumber ?? "—"}</td>
                  <td className="py-2 text-text-secondary">{p.user.name}</td>
                  <td className={`py-2 ${p.kind === "REFUND" ? "text-danger" : "text-text-secondary"}`}>
                    {p.kind === "REFUND" ? "-" : ""}
                    {formatNaira(p.amountKobo)}
                  </td>
                  <td className="py-2 text-text-secondary">{p.provider}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                      {p.kind === "REFUND" && <span className="text-xs text-text-muted">(refund)</span>}
                    </div>
                  </td>
                  <td className="py-2 text-text-muted">{new Date(p.createdAt).toLocaleDateString("en-NG")}</td>
                  <td className="py-2 text-right">
                    {p.kind === "CHARGE" && p.status === "SUCCESS" && !refundedSet.has(p.id) && (
                      <form action={refundPayment} className="flex justify-end gap-1">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <input
                          name="reason"
                          placeholder="Reason…"
                          required
                          className="w-28 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                        />
                        <button type="submit" className="rounded-lg border border-danger/40 px-2 py-1 text-xs text-danger hover:border-danger">
                          Refund
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Link
            href={`/dashboard/admin/finance?page=${Math.max(1, page - 1)}`}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-text-secondary hover:border-text-muted"
          >
            ← Prev
          </Link>
          <span className="text-text-muted">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/dashboard/admin/finance?page=${Math.min(totalPages, page + 1)}`}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-text-secondary hover:border-text-muted"
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
