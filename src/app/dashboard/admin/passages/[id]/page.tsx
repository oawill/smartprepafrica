import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { PassageForm } from "@/components/admin/passage-form";
import {
  updatePassage,
  submitPassageForReview,
  approvePassage,
  sendPassageBackForChanges,
  publishPassage,
  archivePassage,
  restorePassage,
  attachQuestionToPassage,
  detachQuestionFromPassage,
  reorderPassageQuestion,
} from "@/app/dashboard/admin/passages/actions";

export default async function PassageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAdminPagePermission("questions.view");
  const { id } = await params;
  const { error } = await searchParams;

  const passage = await prisma.passageGroup.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true } },
      questions: { orderBy: { passageOrder: "asc" } },
    },
  });
  if (!passage) notFound();

  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  const adminRole = session.user.adminRole;
  const canEdit = hasPermission(adminRole, "questions.edit");

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {passage.title ?? passage.code ?? passage.id}{" "}
            <span className="text-base font-normal text-text-muted">· {passage.status}</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {passage.code} · {passage.subject.name} · {passage.exam} · {passage.type.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/dashboard/admin/passages/${passage.id}/preview`}
            className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
          >
            Preview student experience
          </Link>
          {passage.status === "DRAFT" && hasPermission(adminRole, "questions.create") && (
            <form action={submitPassageForReview}>
              <input type="hidden" name="id" value={passage.id} />
              <button type="submit" className="rounded-lg border border-info/40 px-3 py-2 text-xs text-info hover:border-info">
                Submit for review
              </button>
            </form>
          )}
          {(passage.status === "DRAFT" || passage.status === "NEEDS_REVIEW") &&
            hasPermission(adminRole, "questions.approve") && (
              <form action={approvePassage}>
                <input type="hidden" name="id" value={passage.id} />
                <button type="submit" className="rounded-lg border border-success/40 px-3 py-2 text-xs text-success hover:border-success">
                  Approve
                </button>
              </form>
            )}
          {passage.status === "NEEDS_REVIEW" && hasPermission(adminRole, "questions.approve") && (
            <form action={sendPassageBackForChanges}>
              <input type="hidden" name="id" value={passage.id} />
              <button type="submit" className="rounded-lg border border-warning/40 px-3 py-2 text-xs text-warning hover:border-warning">
                Send back
              </button>
            </form>
          )}
          {passage.status === "APPROVED" && hasPermission(adminRole, "questions.publish") && (
            <form action={publishPassage}>
              <input type="hidden" name="id" value={passage.id} />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                Publish
              </button>
            </form>
          )}
          {passage.status !== "ARCHIVED" && hasPermission(adminRole, "questions.archive") && (
            <form action={archivePassage}>
              <input type="hidden" name="id" value={passage.id} />
              <button type="submit" className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger hover:border-danger">
                Archive
              </button>
            </form>
          )}
          {passage.status === "ARCHIVED" && hasPermission(adminRole, "questions.archive") && (
            <form action={restorePassage}>
              <input type="hidden" name="id" value={passage.id} />
              <button type="submit" className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted">
                Restore to draft
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

      <div className="mt-6">
        <Card title={`Questions in this passage (${passage.questions.length})`}>
          {passage.questions.length === 0 ? (
            <p className="text-sm text-text-muted">No questions attached yet.</p>
          ) : (
            <div className="space-y-2">
              {passage.questions.map((q, i) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/admin/questions/${q.id}`}
                      className="block truncate text-sm text-text-primary hover:underline"
                    >
                      {i + 1}. {q.prompt}
                    </Link>
                    <p className="text-xs text-text-muted">
                      {q.questionNumber ?? q.id} · {q.status}
                      {q.passageLineRef ? ` · ${q.passageLineRef}` : ""}
                      {q.passageLineStart
                        ? ` · Lines ${q.passageLineStart}${q.passageLineEnd && q.passageLineEnd !== q.passageLineStart ? `–${q.passageLineEnd}` : ""}`
                        : ""}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={reorderPassageQuestion}>
                        <input type="hidden" name="questionId" value={q.id} />
                        <input type="hidden" name="passageGroupId" value={passage.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={i === 0}
                          className="rounded border border-border-strong px-2 py-1 text-xs text-text-secondary hover:border-text-muted disabled:opacity-30"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={reorderPassageQuestion}>
                        <input type="hidden" name="questionId" value={q.id} />
                        <input type="hidden" name="passageGroupId" value={passage.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={i === passage.questions.length - 1}
                          className="rounded border border-border-strong px-2 py-1 text-xs text-text-secondary hover:border-text-muted disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </form>
                      <form action={detachQuestionFromPassage}>
                        <input type="hidden" name="questionId" value={q.id} />
                        <input type="hidden" name="passageGroupId" value={passage.id} />
                        <button
                          type="submit"
                          className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:border-danger"
                        >
                          Detach
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <form action={attachQuestionToPassage} className="mt-4 flex gap-2">
              <input type="hidden" name="passageGroupId" value={passage.id} />
              <input
                name="question"
                placeholder="Existing question ID or reference number (e.g. QUE-00012345)"
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-brand"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
              >
                Attach
              </button>
            </form>
          )}
          <p className="mt-2 text-xs text-text-muted">
            Create a new standalone question first (Questions → New question), then attach it here by its
            ID or reference number.
          </p>
        </Card>
      </div>

      <div className="mt-6 max-w-4xl">
        <Card title="Edit passage">
          {canEdit ? (
            <PassageForm
              action={updatePassage}
              subjects={subjects}
              initial={{
                id: passage.id,
                exam: passage.exam,
                subjectId: passage.subjectId,
                type: passage.type,
                title: passage.title,
                instructions: passage.instructions,
                bodyText: passage.bodyText,
                showLineNumbers: passage.showLineNumbers,
                startingLineNumber: passage.startingLineNumber,
              }}
            />
          ) : (
            <p className="text-sm text-text-muted">Your admin role does not have permission to edit passages.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
