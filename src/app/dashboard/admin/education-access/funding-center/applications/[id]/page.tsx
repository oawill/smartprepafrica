import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { updateApplication, addQuestion, updateQuestion } from "@/app/dashboard/admin/education-access/funding-center/applications/actions";
import { recordOutreach } from "@/app/dashboard/admin/education-access/funding-center/outreach/actions";

const applicationStatuses = ["DRAFTING", "IN_REVIEW", "SUBMITTED", "WITHDRAWN"] as const;
const questionStatuses = ["NOT_STARTED", "DRAFT", "REVIEW", "APPROVED"] as const;
const outreachTypes = ["EMAIL", "PHONE", "MEETING", "INTRODUCTION", "CONFERENCE", "LINKEDIN", "REFERRAL", "OTHER"] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default async function ApplicationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPagePermission("funding_center.view");
  const { id } = await params;

  const application = await prisma.educationAccessApplication.findUnique({
    where: { id },
    include: {
      opportunity: { include: { funder: true } },
      questions: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!application) notFound();
  const { opportunity } = application;

  return (
    <div>
      <Link href={`/dashboard/admin/education-access/funding-center/opportunities/${opportunity.id}`} className="text-sm text-brand-text hover:underline">
        ← {opportunity.opportunityName}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-text-primary">Application Workspace</h1>
      <p className="text-sm text-text-secondary">{opportunity.funder.organizationName} — {opportunity.opportunityName}</p>

      <div className="mt-6">
        <Card title="Opportunity Summary">
          <p className="text-sm text-text-secondary">
            {opportunity.description ?? "No description on file."}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Deadline: {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString("en-US") : opportunity.rollingDeadline ? "Rolling" : "—"}
            {" · "}LOI required: {opportunity.loiRequired ? "Yes" : "No"}
          </p>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Narrative — Application Questions">
          {application.questions.length === 0 ? (
            <p className="text-sm text-text-secondary">No questions added yet.</p>
          ) : (
            <div className="space-y-4">
              {application.questions.map((q) => {
                const responseLength = q.response?.length ?? 0;
                const responseWords = countWords(q.response ?? "");
                return (
                  <form key={q.id} action={updateQuestion} className="space-y-2 border-b border-border pb-4">
                    <input type="hidden" name="questionId" value={q.id} />
                    <input type="hidden" name="applicationId" value={application.id} />
                    <p className="font-medium text-text-primary">{q.question}</p>
                    {(q.wordLimit || q.characterLimit) && (
                      <p className="text-xs text-text-muted">
                        {q.wordLimit ? `Word limit: ${q.wordLimit}` : ""}
                        {q.wordLimit && q.characterLimit ? " · " : ""}
                        {q.characterLimit ? `Character limit: ${q.characterLimit}` : ""}
                      </p>
                    )}
                    <textarea name="response" defaultValue={q.response ?? ""} rows={4} className={inputClass} />
                    <p className="text-xs text-text-muted">
                      {responseWords} words · {responseLength} characters
                      {q.wordLimit && responseWords > q.wordLimit && <span className="text-danger"> — over word limit</span>}
                      {q.characterLimit && responseLength > q.characterLimit && <span className="text-danger"> — over character limit</span>}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select name="status" defaultValue={q.status} className={inputClass}>
                        {questionStatuses.map((s) => (
                          <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                        ))}
                      </select>
                      <input name="internalNotes" defaultValue={q.internalNotes ?? ""} placeholder="Internal notes" className={inputClass} />
                    </div>
                    <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
                      Save response
                    </button>
                  </form>
                );
              })}
            </div>
          )}
          <form action={addQuestion} className="mt-4 space-y-2 border-t border-border pt-4">
            <input type="hidden" name="applicationId" value={application.id} />
            <input name="question" required placeholder="Question text" className={inputClass} />
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="wordLimit" type="number" placeholder="Word limit (optional)" className={inputClass} />
              <input name="characterLimit" type="number" placeholder="Character limit (optional)" className={inputClass} />
            </div>
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Add Question
            </button>
          </form>
        </Card>
      </div>

      <form action={updateApplication} className="mt-4 space-y-4">
        <input type="hidden" name="applicationId" value={application.id} />

        <Card title="Requirements & Documents">
          <textarea name="requiredDocumentsNote" defaultValue={application.requiredDocumentsNote ?? ""} rows={3} placeholder="Required supporting materials…" className={inputClass} />
        </Card>

        <Card title="Budget">
          <p className="text-xs text-text-muted">
            Reference categories: Program Access, Content, School Engagement, Technology, Monitoring &amp; Evaluation, Program Administration.
          </p>
          <textarea name="budgetNarrative" defaultValue={application.budgetNarrative ?? ""} rows={4} className={inputClass} />
        </Card>

        <Card title="Team">
          <textarea name="teamNotes" defaultValue={application.teamNotes ?? ""} rows={2} className={inputClass} />
        </Card>

        <Card title="Timeline">
          <textarea name="timelineNotes" defaultValue={application.timelineNotes ?? ""} rows={2} className={inputClass} />
        </Card>

        <Card title="Submission">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" defaultValue={application.status} className={inputClass}>
                {applicationStatuses.map((s) => (
                  <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Submitted date</label>
              <input name="submittedAt" type="date" defaultValue={application.submittedAt?.toISOString().slice(0, 10)} className={inputClass} />
            </div>
          </div>
          <textarea name="submissionNotes" defaultValue={application.submissionNotes ?? ""} rows={2} placeholder="Submission notes" className={inputClass + " mt-2"} />
        </Card>

        <Card title="Follow-Up">
          <textarea name="followUpNotes" defaultValue={application.followUpNotes ?? ""} rows={2} className={inputClass} />
          <button type="submit" className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
            Save Application
          </button>
        </Card>
      </form>

      <div className="mt-4">
        <Card title="Record Outreach for This Opportunity">
          <form action={recordOutreach} className="space-y-2">
            <input type="hidden" name="funderId" value={opportunity.funderId} />
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <select name="type" required className={inputClass}>
              {outreachTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input name="subject" placeholder="Subject" className={inputClass} />
            <textarea name="notes" placeholder="Notes" rows={2} className={inputClass} />
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Record Outreach
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
