import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFTING: "neutral",
  IN_REVIEW: "warning",
  SUBMITTED: "info",
  WITHDRAWN: "danger",
};

export default async function FundingCenterApplicationsPage() {
  await requireAdminPagePermission("funding_center.view");

  const applications = await prisma.educationAccessApplication.findMany({
    include: { opportunity: { include: { funder: { select: { organizationName: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Applications</h1>
      <p className="mt-1 text-sm text-text-secondary">Every application workspace SmartPrepAfrica has started.</p>

      <div className="mt-6 space-y-3">
        {applications.length === 0 ? (
          <Card title="No applications yet">
            <p className="text-sm text-text-secondary">
              Start one from an opportunity&apos;s detail page.
            </p>
          </Card>
        ) : (
          applications.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/admin/education-access/funding-center/applications/${a.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4 hover:border-brand"
            >
              <div>
                <p className="font-semibold text-text-primary">{a.opportunity.opportunityName}</p>
                <p className="text-xs text-text-muted">{a.opportunity.funder.organizationName}</p>
              </div>
              <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status.replaceAll("_", " ")}</Badge>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
