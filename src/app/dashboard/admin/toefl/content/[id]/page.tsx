import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { ToeflContentForm } from "@/components/admin/toefl-content-form";
import {
  updateToeflContent,
  submitToeflContentForReview,
  approveToeflContent,
  sendToeflContentBack,
  publishToeflContent,
  archiveToeflContent,
  restoreToeflContent,
  duplicateToeflContent,
} from "@/app/dashboard/admin/toefl/content/actions";

export default async function ToeflContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAdminPagePermission("toefl.view");

  const { id } = await params;
  const { error } = await searchParams;
  const content = await prisma.toeflContent.findUnique({ where: { id } });
  if (!content) notFound();

  const creator = content.createdById
    ? await prisma.user.findUnique({ where: { id: content.createdById }, select: { name: true } })
    : null;
  const adminRole = session.user.adminRole;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {content.skill} · {content.taskType}{" "}
            <span className="text-base font-normal text-text-muted">· {content.status}</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {content.difficulty}
            {creator && ` · Created by ${creator.name}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {content.status === "DRAFT" && hasPermission(adminRole, "toefl.create") && (
            <form action={submitToeflContentForReview}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg border border-info/40 px-3 py-2 text-xs text-info hover:border-info">
                Submit for review
              </button>
            </form>
          )}
          {(content.status === "DRAFT" || content.status === "NEEDS_REVIEW") &&
            hasPermission(adminRole, "toefl.review") && (
              <form action={approveToeflContent}>
                <input type="hidden" name="id" value={content.id} />
                <button type="submit" className="rounded-lg border border-success/40 px-3 py-2 text-xs text-success hover:border-success">
                  Approve
                </button>
              </form>
            )}
          {content.status === "NEEDS_REVIEW" && hasPermission(adminRole, "toefl.review") && (
            <form action={sendToeflContentBack}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg border border-warning/40 px-3 py-2 text-xs text-warning hover:border-warning">
                Send back for changes
              </button>
            </form>
          )}
          {content.status === "APPROVED" && hasPermission(adminRole, "toefl.publish") && (
            <form action={publishToeflContent}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                Publish
              </button>
            </form>
          )}
          {content.status !== "ARCHIVED" && hasPermission(adminRole, "toefl.archive") && (
            <form action={archiveToeflContent}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger hover:border-danger">
                Archive
              </button>
            </form>
          )}
          {content.status === "ARCHIVED" && hasPermission(adminRole, "toefl.archive") && (
            <form action={restoreToeflContent}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted">
                Restore to draft
              </button>
            </form>
          )}
          {hasPermission(adminRole, "toefl.create") && (
            <form action={duplicateToeflContent}>
              <input type="hidden" name="id" value={content.id} />
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

      <div className="mt-6 max-w-3xl">
        <Card title="Edit">
          {hasPermission(adminRole, "toefl.create") ? (
            <ToeflContentForm
              action={updateToeflContent}
              initial={{
                id: content.id,
                skill: content.skill,
                taskType: content.taskType,
                difficulty: content.difficulty,
                prompt: content.prompt,
                passage: content.passage,
                audioUrl: content.audioUrl,
                audioDurationSec: content.audioDurationSec,
                transcript: content.transcript,
                options: content.options as { key: string; text: string }[] | null,
                correctOption: content.correctOption,
                explanation: content.explanation,
                estimatedTimeSec: content.estimatedTimeSec,
                tags: content.tags,
              }}
            />
          ) : (
            <p className="text-sm text-text-muted">Your admin role does not have permission to edit TOEFL content.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
