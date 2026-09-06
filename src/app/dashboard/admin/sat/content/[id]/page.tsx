import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { SatContentForm } from "@/components/admin/sat-content-form";
import { SAT_SECTION_LABELS } from "@/lib/sat/types";
import {
  updateSatContent,
  submitSatContentForReview,
  approveSatContent,
  sendSatContentBack,
  publishSatContent,
  archiveSatContent,
  restoreSatContent,
  duplicateSatContent,
} from "@/app/dashboard/admin/sat/content/actions";

export default async function SatContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAdminPagePermission("sat.view");

  const { id } = await params;
  const { error } = await searchParams;
  const content = await prisma.satContent.findUnique({ where: { id } });
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
            {SAT_SECTION_LABELS[content.section]} · {content.domain}{" "}
            <span className="text-base font-normal text-text-muted">· {content.status}</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {content.difficulty} · {content.questionType.replace("_", " ")}
            {creator && ` · Created by ${creator.name}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {content.status === "DRAFT" && hasPermission(adminRole, "sat.create") && (
            <form action={submitSatContentForReview}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg border border-info/40 px-3 py-2 text-xs text-info hover:border-info">
                Submit for review
              </button>
            </form>
          )}
          {(content.status === "DRAFT" || content.status === "NEEDS_REVIEW") &&
            hasPermission(adminRole, "sat.review") && (
              <form action={approveSatContent}>
                <input type="hidden" name="id" value={content.id} />
                <button type="submit" className="rounded-lg border border-success/40 px-3 py-2 text-xs text-success hover:border-success">
                  Approve
                </button>
              </form>
            )}
          {content.status === "NEEDS_REVIEW" && hasPermission(adminRole, "sat.review") && (
            <form action={sendSatContentBack}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg border border-warning/40 px-3 py-2 text-xs text-warning hover:border-warning">
                Send back for changes
              </button>
            </form>
          )}
          {content.status === "APPROVED" && hasPermission(adminRole, "sat.publish") && (
            <form action={publishSatContent}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                Publish
              </button>
            </form>
          )}
          {content.status !== "ARCHIVED" && hasPermission(adminRole, "sat.archive") && (
            <form action={archiveSatContent}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger hover:border-danger">
                Archive
              </button>
            </form>
          )}
          {content.status === "ARCHIVED" && hasPermission(adminRole, "sat.archive") && (
            <form action={restoreSatContent}>
              <input type="hidden" name="id" value={content.id} />
              <button type="submit" className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted">
                Restore to draft
              </button>
            </form>
          )}
          {hasPermission(adminRole, "sat.create") && (
            <form action={duplicateSatContent}>
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
          {hasPermission(adminRole, "sat.create") ? (
            <SatContentForm
              action={updateSatContent}
              initial={{
                id: content.id,
                section: content.section,
                domain: content.domain,
                skill: content.skill,
                questionType: content.questionType,
                difficulty: content.difficulty,
                passage: content.passage,
                prompt: content.prompt,
                options: content.options as { key: string; text: string }[] | null,
                correctOption: content.correctOption,
                correctValue: content.correctValue,
                explanation: content.explanation,
                estimatedTimeSec: content.estimatedTimeSec,
                tags: content.tags,
              }}
            />
          ) : (
            <p className="text-sm text-text-muted">Your admin role does not have permission to edit SAT content.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
