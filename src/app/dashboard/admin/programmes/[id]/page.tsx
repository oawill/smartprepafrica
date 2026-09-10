import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import {
  toggleProgrammePublished,
  addProgrammeCourse,
  removeProgrammeCourse,
  reorderProgrammeCourse,
} from "@/app/dashboard/admin/programmes/actions";

export default async function ProgrammeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPagePermission("programmes.manage");
  const { id } = await params;
  const { q } = await searchParams;

  const programme = await prisma.programme.findUnique({
    where: { id },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: { course: { select: { id: true, title: true, published: true, archived: true } } },
      },
    },
  });
  if (!programme) notFound();

  const memberCourseIds = programme.courses.map((c) => c.courseId);
  const searchResults = q
    ? await prisma.course.findMany({
        where: {
          title: { contains: q, mode: "insensitive" },
          id: { notIn: memberCourseIds.length > 0 ? memberCourseIds : undefined },
        },
        select: { id: true, title: true, published: true, archived: true },
        take: 10,
      })
    : [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">{programme.title}</h1>
          {programme.description && (
            <p className="mt-1 text-sm text-text-secondary">{programme.description}</p>
          )}
        </div>
        <form action={toggleProgrammePublished}>
          <input type="hidden" name="id" value={programme.id} />
          <button
            type="submit"
            className={`rounded-lg border px-3 py-2 text-xs ${
              programme.published
                ? "border-border-strong text-text-secondary hover:border-text-muted"
                : "border-brand bg-brand text-brand-foreground hover:bg-brand-hover"
            }`}
          >
            {programme.published ? "Unpublish" : "Publish"}
          </button>
        </form>
      </div>

      <div className="mt-6">
        <Card title={`Member courses (${programme.courses.length})`}>
          {programme.courses.length === 0 ? (
            <p className="text-sm text-text-muted">No member courses yet — add some below.</p>
          ) : (
            <div className="space-y-2">
              {programme.courses.map((pc, i) => (
                <div
                  key={pc.courseId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{pc.course.title}</p>
                    <p className="text-xs text-text-muted">
                      {!pc.course.published && "Unpublished"}
                      {pc.course.archived && (pc.course.published ? "Archived" : " · Archived")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form action={reorderProgrammeCourse}>
                      <input type="hidden" name="courseId" value={pc.courseId} />
                      <input type="hidden" name="programmeId" value={programme.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={i === 0}
                        className="rounded border border-border-strong px-2 py-1 text-xs text-text-secondary hover:border-text-muted disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={reorderProgrammeCourse}>
                      <input type="hidden" name="courseId" value={pc.courseId} />
                      <input type="hidden" name="programmeId" value={programme.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={i === programme.courses.length - 1}
                        className="rounded border border-border-strong px-2 py-1 text-xs text-text-secondary hover:border-text-muted disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={removeProgrammeCourse}>
                      <input type="hidden" name="courseId" value={pc.courseId} />
                      <input type="hidden" name="programmeId" value={programme.id} />
                      <button
                        type="submit"
                        className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:border-danger"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form className="mt-4 flex gap-2">
            <input type="hidden" name="id" value={programme.id} />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search courses by title…"
              className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Search
            </button>
          </form>

          {q && (
            <div className="mt-3 space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-sm text-text-muted">No matching courses.</p>
              ) : (
                searchResults.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <p className="text-sm text-text-primary">
                      {c.title}
                      {c.archived && <span className="ml-2 text-xs text-warning">Archived</span>}
                      {!c.published && <span className="ml-2 text-xs text-text-muted">Unpublished</span>}
                    </p>
                    <form action={addProgrammeCourse}>
                      <input type="hidden" name="programmeId" value={programme.id} />
                      <input type="hidden" name="courseId" value={c.id} />
                      <button
                        type="submit"
                        className="shrink-0 rounded border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
