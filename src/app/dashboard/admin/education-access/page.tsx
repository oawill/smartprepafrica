import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { setInquiryStatus, assignInquiry } from "@/app/dashboard/admin/education-access/actions";

const statusOptions = ["NEW", "CONTACTED", "UNDER_REVIEW", "PARTNER_CONFIRMED", "SPONSORED", "CLOSED"] as const;

const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "warning",
  CONTACTED: "info",
  UNDER_REVIEW: "warning",
  PARTNER_CONFIRMED: "info",
  SPONSORED: "success",
  CLOSED: "neutral",
};

const ORG_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  CORPORATION: "Corporation",
  FOUNDATION: "Foundation",
  NGO: "NGO",
  SCHOOL: "School",
  DIASPORA_ORGANIZATION: "Diaspora Organization",
  ALUMNI_ASSOCIATION: "Alumni Association",
  GOVERNMENT: "Government / Public Sector",
  OTHER: "Other",
};

const INTEREST_LABELS: Record<string, string> = {
  SPONSOR_STUDENT: "Sponsor a Student",
  SPONSOR_SCHOOL: "Sponsor a School",
  SPONSOR_COMMUNITY: "Sponsor a Community",
  AI_TUTOR_10K: "AI Tutor for 10,000 Students",
  GIRLS_IN_STEM: "Girls in STEM",
  CORPORATE_CSR: "Corporate CSR Partnership",
  FOUNDATION_PARTNERSHIP: "Foundation Partnership",
  OTHER: "Other",
};

export default async function AdminEducationAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdminPagePermission("education_access.view");

  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status;

  const inquiries = await prisma.educationAccessInquiry.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { organization: { contains: q, mode: "insensitive" } },
              { message: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const newCount = await prisma.educationAccessInquiry.count({ where: { status: "NEW" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Education Access Inquiries</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {newCount} new inquir{newCount === 1 ? "y" : "ies"} awaiting review.
      </p>

      <div className="mt-6">
        <Card title="Search">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, organization, email, message…"
              className="flex-1 min-w-[200px] rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              <option value="">Any status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {inquiries.length === 0 ? (
          <Card title="No inquiries">
            <p className="text-sm text-text-secondary">No Education Access inquiries match this filter.</p>
          </Card>
        ) : (
          inquiries.map((inquiry) => (
            <Card key={inquiry.id} title={inquiry.fullName}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                <span>
                  {inquiry.organization ? `${inquiry.organization} · ` : ""}
                  {inquiry.email}
                  {inquiry.phone ? ` · ${inquiry.phone}` : ""}
                  {inquiry.country ? ` · ${inquiry.country}` : ""}
                </span>
                <span>{new Date(inquiry.createdAt).toLocaleString("en-NG")}</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {ORG_TYPE_LABELS[inquiry.organizationType]} · {INTEREST_LABELS[inquiry.sponsorshipInterest]}
                {inquiry.estimatedStudents ? ` · ~${inquiry.estimatedStudents} students` : ""}
              </p>
              <p className="mt-2 text-sm text-text-secondary">{inquiry.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[inquiry.status] ?? "neutral"}>{inquiry.status.replaceAll("_", " ")}</Badge>
                {inquiry.assignedTo && (
                  <span className="text-xs text-text-muted">· Assigned to {inquiry.assignedTo.name}</span>
                )}
                <form action={setInquiryStatus} className="ml-auto flex items-center gap-2">
                  <input type="hidden" name="inquiryId" value={inquiry.id} />
                  <select
                    name="status"
                    defaultValue={inquiry.status}
                    className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted"
                  >
                    Update
                  </button>
                </form>
                <form action={assignInquiry}>
                  <input type="hidden" name="inquiryId" value={inquiry.id} />
                  <input type="hidden" name="assignToSelf" value={inquiry.assignedToId ? "" : "on"} />
                  <button
                    type="submit"
                    className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted"
                  >
                    {inquiry.assignedToId ? "Unassign" : "Assign to me"}
                  </button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
