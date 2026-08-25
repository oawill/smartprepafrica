import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { QuestionForm } from "@/components/admin/question-form";
import {
  updateQuestion,
  submitForReview,
  approveQuestion,
  sendBackForChanges,
  publishQuestion,
  archiveQuestion,
  restoreQuestion,
  duplicateQuestion,
} from "@/app/dashboard/admin/questions/actions";

export default async function QuestionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAdminPagePermission("questions.view");

  const { id } = await params;
  const { error } = await searchParams;
  const question = await prisma.question.findUnique({
    where: { id },
    include: { subject: { select: { name: true } } },
  });
  if (!question) notFound();

  const [creator, reviewer, duplicateOf] = await Promise.all([
    question.createdById ? prisma.user.findUnique({ where: { id: question.createdById }, select: { name: true } }) : null,
    question.reviewedById ? prisma.user.findUnique({ where: { id: question.reviewedById }, select: { name: true } }) : null,
    question.duplicateOfId
      ? prisma.question.findUnique({ where: { id: question.duplicateOfId }, select: { id: true, questionNumber: true } })
      : null,
  ]);

  const [subjects, passages] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.passageGroup.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, code: true, title: true, exam: true, subjectId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const adminRole = session.user.adminRole;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {question.questionNumber ?? question.id} <span className="text-base font-normal text-text-muted">· {question.status}</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {question.subject.name} · {question.exam}
            {creator && ` · Created by ${creator.name}`}
            {reviewer && ` · Reviewed by ${reviewer.name}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {question.status === "DRAFT" && hasPermission(adminRole, "questions.create") && (
            <form action={submitForReview}>
              <input type="hidden" name="id" value={question.id} />
              <button type="submit" className="rounded-lg border border-info/40 px-3 py-2 text-xs text-info hover:border-info">
                Submit for review
              </button>
            </form>
          )}
          {(question.status === "DRAFT" || question.status === "NEEDS_REVIEW") &&
            hasPermission(adminRole, "questions.approve") && (
              <form action={approveQuestion}>
                <input type="hidden" name="id" value={question.id} />
                <button type="submit" className="rounded-lg border border-success/40 px-3 py-2 text-xs text-success hover:border-success">
                  Approve
                </button>
              </form>
            )}
          {question.status === "NEEDS_REVIEW" && hasPermission(adminRole, "questions.approve") && (
            <form action={sendBackForChanges}>
              <input type="hidden" name="id" value={question.id} />
              <button type="submit" className="rounded-lg border border-warning/40 px-3 py-2 text-xs text-warning hover:border-warning">
                Send back for changes
              </button>
            </form>
          )}
          {question.status === "APPROVED" && hasPermission(adminRole, "questions.publish") && (
            <form action={publishQuestion}>
              <input type="hidden" name="id" value={question.id} />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                Publish
              </button>
            </form>
          )}
          {question.status !== "ARCHIVED" && hasPermission(adminRole, "questions.archive") && (
            <form action={archiveQuestion}>
              <input type="hidden" name="id" value={question.id} />
              <button type="submit" className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger hover:border-danger">
                Archive
              </button>
            </form>
          )}
          {question.status === "ARCHIVED" && hasPermission(adminRole, "questions.archive") && (
            <form action={restoreQuestion}>
              <input type="hidden" name="id" value={question.id} />
              <button type="submit" className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted">
                Restore to draft
              </button>
            </form>
          )}
          {hasPermission(adminRole, "questions.create") && (
            <form action={duplicateQuestion}>
              <input type="hidden" name="id" value={question.id} />
              <button type="submit" className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted">
                Duplicate
              </button>
            </form>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger-surface px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {question.duplicateOfId && duplicateOf && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-surface px-4 py-3 text-sm text-warning">
          Flagged as a possible duplicate of{" "}
          <Link href={`/dashboard/admin/questions/${duplicateOf.id}`} className="underline">
            {duplicateOf.questionNumber ?? duplicateOf.id}
          </Link>
          . Not auto-removed — review and archive one copy if it is confirmed.
        </div>
      )}

      <div className="mt-6 max-w-3xl">
        <Card title="Edit">
          {hasPermission(adminRole, "questions.edit") ? (
            <QuestionForm
              action={updateQuestion}
              subjects={subjects}
              passages={passages}
              initial={{
                id: question.id,
                exam: question.exam,
                subjectId: question.subjectId,
                topic: question.topic,
                subtopic: question.subtopic,
                grade: question.grade,
                year: question.year,
                difficulty: question.difficulty,
                prompt: question.prompt,
                imageUrl: question.imageUrl,
                options: question.options as { key: string; text: string }[],
                correctOption: question.correctOption,
                explanation: question.explanation,
                sourceType: question.sourceType,
                passageGroupId: question.passageGroupId,
                passageLineRef: question.passageLineRef,
                passageLineStart: question.passageLineStart,
                passageLineEnd: question.passageLineEnd,
              }}
            />
          ) : (
            <p className="text-sm text-text-muted">Your admin role does not have permission to edit questions.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
