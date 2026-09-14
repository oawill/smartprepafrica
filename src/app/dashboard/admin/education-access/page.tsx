import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { setInquiryStatus, assignInquiry, updateInquiryDetails } from "@/app/dashboard/admin/education-access/actions";

const statusOptions = [
  "INQUIRY",
  "CONTACTED",
  "PROPOSAL_SENT",
  "UNDER_REVIEW",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CLOSED",
] as const;

const paymentStatusOptions = ["NOT_REQUIRED", "PENDING", "PAID", "PARTIALLY_PAID", "REFUNDED"] as const;

const STATUS_TONE: Record<string, BadgeTone> = {
  INQUIRY: "warning",
  CONTACTED: "info",
  PROPOSAL_SENT: "info",
  UNDER_REVIEW: "warning",
  CONFIRMED: "info",
  ACTIVE: "success",
  COMPLETED: "success",
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

const PACKAGE_LABELS: Record<string, string> = {
  STUDENT_SPONSOR: "Sponsor 1 Student",
  CLASSROOM_SPONSOR: "Sponsor 10 Students",
  SCHOOL_PARTNER: "Sponsor 50 Students",
  COMMUNITY_CHAMPION: "Sponsor a Classroom",
  FLAGSHIP_AI_TUTOR: "Sponsor a School",
  CUSTOM: "Custom Partnership",
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
    include: {
      assignedTo: { select: { name: true } },
      preferredSchool: { select: { name: true } },
      program: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const [newCount, programs] = await Promise.all([
    prisma.educationAccessInquiry.count({ where: { status: "INQUIRY" } }),
    prisma.sponsorshipProgram.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

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
                {inquiry.packageInterest ? ` · ${PACKAGE_LABELS[inquiry.packageInterest]}` : ""}
                {inquiry.estimatedStudents ? ` · ~${inquiry.estimatedStudents} students` : ""}
                {inquiry.preferredLocation ? ` · ${inquiry.preferredLocation}` : ""}
                {inquiry.preferredSchool ? ` · ${inquiry.preferredSchool.name}` : ""}
                {inquiry.consentGiven ? "" : " · No contact consent recorded"}
              </p>
              <p className="mt-2 text-sm text-text-secondary">{inquiry.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[inquiry.status] ?? "neutral"}>{inquiry.status.replaceAll("_", " ")}</Badge>
                <Badge tone={inquiry.paymentStatus === "PAID" ? "success" : "neutral"}>
                  {inquiry.paymentStatus.replaceAll("_", " ")}
                </Badge>
                {inquiry.program && <span className="text-xs text-text-muted">· Program: {inquiry.program.name}</span>}
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

              <form
                action={updateInquiryDetails}
                className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input type="hidden" name="inquiryId" value={inquiry.id} />
                <div>
                  <label className="block text-xs text-text-muted">Amount (minor units)</label>
                  <input
                    type="number"
                    name="amountMinor"
                    defaultValue={inquiry.amountMinor ?? ""}
                    className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Currency</label>
                  <select
                    name="currency"
                    defaultValue={inquiry.currency ?? ""}
                    className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
                  >
                    <option value="">—</option>
                    {["NGN", "USD", "GBP", "EUR"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Payment status</label>
                  <select
                    name="paymentStatus"
                    defaultValue={inquiry.paymentStatus}
                    className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
                  >
                    {paymentStatusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Program</label>
                  <select
                    name="programId"
                    defaultValue={inquiry.programId ?? ""}
                    className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
                  >
                    <option value="">None</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-xs text-text-muted">Internal notes (never shown publicly)</label>
                  <textarea
                    name="internalNotes"
                    defaultValue={inquiry.internalNotes ?? ""}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted"
                  >
                    Save details
                  </button>
                </div>
              </form>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
