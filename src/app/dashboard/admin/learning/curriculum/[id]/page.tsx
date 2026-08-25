import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import {
  toggleCurriculumActive,
  createClassLevel,
  toggleClassLevelActive,
  reorderClassLevel,
} from "@/app/dashboard/admin/learning/curriculum/actions";

export default async function CurriculumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPagePermission("curriculum.manage");
  const { id } = await params;

  const curriculum = await prisma.curriculum.findUnique({
    where: { id },
    include: {
      classLevels: {
        orderBy: { order: "asc" },
        include: { _count: { select: { courses: true } } },
      },
    },
  });
  if (!curriculum) notFound();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {curriculum.name}{" "}
            <span className="text-base font-normal text-slate-500">· {curriculum.code}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">{curriculum.country}</p>
        </div>
        <form action={toggleCurriculumActive}>
          <input type="hidden" name="id" value={curriculum.id} />
          <button
            type="submit"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            {curriculum.isActive ? "Deactivate" : "Activate"}
          </button>
        </form>
      </div>

      {curriculum.description && (
        <p className="mt-4 text-sm text-slate-400">{curriculum.description}</p>
      )}

      <div className="mt-6">
        <Card title={`Class levels (${curriculum.classLevels.length})`}>
          {curriculum.classLevels.length === 0 ? (
            <p className="text-sm text-slate-500">No class levels yet — add one below.</p>
          ) : (
            <div className="space-y-2">
              {curriculum.classLevels.map((cl, i) => (
                <div
                  key={cl.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {cl.name}
                      {cl.code ? ` (${cl.code})` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {cl._count.courses} course{cl._count.courses === 1 ? "" : "s"} ·{" "}
                      {cl.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form action={reorderClassLevel}>
                      <input type="hidden" name="id" value={cl.id} />
                      <input type="hidden" name="curriculumId" value={curriculum.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={i === 0}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={reorderClassLevel}>
                      <input type="hidden" name="id" value={cl.id} />
                      <input type="hidden" name="curriculumId" value={curriculum.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={i === curriculum.classLevels.length - 1}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={toggleClassLevelActive}>
                      <input type="hidden" name="id" value={cl.id} />
                      <input type="hidden" name="curriculumId" value={curriculum.id} />
                      <button
                        type="submit"
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500"
                      >
                        {cl.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form action={createClassLevel} className="mt-4 flex gap-2">
            <input type="hidden" name="curriculumId" value={curriculum.id} />
            <input
              name="name"
              required
              placeholder="e.g. SS2"
              className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="code"
              placeholder="Short code (optional)"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Add class level
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
