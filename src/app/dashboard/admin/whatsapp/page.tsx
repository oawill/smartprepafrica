import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { DATE_RANGE_LABELS, parseDateRange, rangeSince, type DateRangeKey } from "@/lib/admin/date-range";

const RANGE_KEYS: DateRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];

export default async function AdminWhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPagePermission("whatsapp.view");

  const { range: rangeParam } = await searchParams;
  const range = parseDateRange(rangeParam);
  const since = rangeSince(range);
  const rangeFilter = since ? { createdAt: { gte: since } } : {};

  const [
    linkedAccounts,
    activeAccounts,
    optInsInRange,
    optOutsInRange,
    messagesSent,
    messagesFailed,
    messagesReceived,
    practiceQuestionsCompleted,
  ] = await Promise.all([
    prisma.whatsAppAccount.count(),
    prisma.whatsAppAccount.count({ where: { whatsappEnabled: true } }),
    prisma.whatsAppAccount.count({ where: { optInAt: since ? { gte: since } : { not: null } } }),
    prisma.whatsAppAccount.count({ where: { optOutAt: since ? { gte: since } : { not: null } } }),
    prisma.whatsAppMessageLog.count({ where: { direction: "OUTBOUND", status: "sent", ...rangeFilter } }),
    prisma.whatsAppMessageLog.count({ where: { direction: "OUTBOUND", status: "failed", ...rangeFilter } }),
    prisma.whatsAppMessageLog.count({ where: { direction: "INBOUND", ...rangeFilter } }),
    prisma.questionResponse.count({
      where: {
        selectedOption: { not: null },
        attempt: { channel: "whatsapp", ...(since ? { startedAt: { gte: since } } : {}) },
      },
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">WhatsApp</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Operational metrics for the SmartPrepAfrica WhatsApp channel — no conversation content is
            shown here.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface-raised p-1 text-xs">
          {RANGE_KEYS.map((key) => (
            <Link
              key={key}
              href={`/dashboard/admin/whatsapp?range=${key}`}
              className={`rounded-md px-3 py-1.5 ${
                range === key ? "bg-brand text-brand-foreground" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {DATE_RANGE_LABELS[key]}
            </Link>
          ))}
        </div>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">Accounts</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Linked accounts">
          <p className="text-3xl font-semibold">{linkedAccounts}</p>
        </Card>
        <Card title="Active (opted in)">
          <p className="text-3xl font-semibold">{activeAccounts}</p>
        </Card>
        <Card title={`Opt-ins (${DATE_RANGE_LABELS[range]})`}>
          <p className="text-3xl font-semibold">{optInsInRange}</p>
        </Card>
        <Card title={`Opt-outs (${DATE_RANGE_LABELS[range]})`}>
          <p className="text-3xl font-semibold">{optOutsInRange}</p>
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Messages ({DATE_RANGE_LABELS[range]})
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Messages received">
          <p className="text-3xl font-semibold">{messagesReceived}</p>
        </Card>
        <Card title="Messages sent">
          <p className="text-3xl font-semibold">{messagesSent}</p>
        </Card>
        <Card title="Failed messages">
          <p className="text-3xl font-semibold">{messagesFailed}</p>
        </Card>
        <Card title="Practice questions completed">
          <p className="text-3xl font-semibold">{practiceQuestionsCompleted}</p>
          <p className="text-xs text-text-muted">Answered via WhatsApp Exam Prep.</p>
        </Card>
      </div>
    </div>
  );
}
