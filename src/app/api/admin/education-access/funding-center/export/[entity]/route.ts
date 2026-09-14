import { NextRequest, NextResponse } from "next/server";
import { requireActionPermission } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

// Server-side permission check, not UI-only gating (brief §31) — a
// logged-out or non-permissioned request never reaches the query below.
function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  await requireActionPermission("funding_center.manage");
  const { entity } = await params;

  let header: string[];
  let rows: (string | number | null | undefined)[][];

  if (entity === "opportunities") {
    const data = await prisma.educationAccessFundingOpportunity.findMany({ include: { funder: true } });
    header = ["Opportunity", "Funder", "Type", "Status", "Priority", "Deadline", "Total Score", "Amount Requested", "Amount Awarded", "Assigned", "Notes"];
    rows = data.map((o) => [o.opportunityName, o.funder.organizationName, o.opportunityType, o.status, o.priority, o.deadline?.toISOString() ?? "", o.totalScore ?? "", o.amountRequestedMinor ?? "", o.amountAwardedMinor ?? "", o.assignedToId ?? "", o.notes ?? ""]);
  } else if (entity === "funders") {
    const data = await prisma.educationAccessFunder.findMany();
    header = ["Organization", "Type", "Country", "Website", "Geographic Focus", "Funding Focus", "Notes"];
    rows = data.map((f) => [f.organizationName, f.organizationType, f.country ?? "", f.website ?? "", f.geographicFocus ?? "", f.fundingFocus ?? "", f.notes ?? ""]);
  } else if (entity === "applications") {
    const data = await prisma.educationAccessApplication.findMany({ include: { opportunity: { include: { funder: true } } } });
    header = ["Opportunity", "Funder", "Status", "Submitted At", "Budget Narrative", "Submission Notes"];
    rows = data.map((a) => [a.opportunity.opportunityName, a.opportunity.funder.organizationName, a.status, a.submittedAt?.toISOString() ?? "", a.budgetNarrative ?? "", a.submissionNotes ?? ""]);
  } else if (entity === "outreach") {
    const data = await prisma.educationAccessOutreach.findMany({ include: { funder: true, contact: true } });
    header = ["Funder", "Contact", "Type", "Date", "Subject", "Notes", "Response", "Follow-up Date"];
    rows = data.map((o) => [
      o.funder.organizationName,
      o.contact ? `${o.contact.firstName} ${o.contact.lastName ?? ""}`.trim() : "",
      o.type,
      o.date.toISOString(),
      o.subject ?? "",
      o.notes ?? "",
      o.response ?? "",
      o.followUpDate?.toISOString() ?? "",
    ]);
  } else if (entity === "tasks") {
    const data = await prisma.educationAccessTask.findMany({ include: { opportunity: true, owner: true } });
    header = ["Task", "Opportunity", "Owner", "Due Date", "Priority", "Status", "Notes"];
    rows = data.map((t) => [t.task, t.opportunity?.opportunityName ?? "", t.owner?.name ?? "", t.dueDate?.toISOString() ?? "", t.priority, t.status, t.notes ?? ""]);
  } else {
    return new NextResponse("Unknown export entity", { status: 400 });
  }

  const csv = [toCsvRow(header), ...rows.map(toCsvRow)].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${entity}.csv"`,
    },
  });
}
