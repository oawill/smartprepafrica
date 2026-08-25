import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";

export default async function AdminCurriculumPage() {
  await requireAdminPagePermission("curriculum.manage");

  const curricula = await prisma.curriculum.findMany({
    include: { _count: { select: { classLevels: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Curriculum &amp; Class Levels</h1>
          <p className="mt-1 text-sm text-slate-400">
            The top of the learning hierarchy — a curriculum groups class levels (e.g. SS1–SS3), which
            courses are optionally tagged with for browsing.
          </p>
        </div>
        <Link
          href="/dashboard/admin/learning/curriculum/new"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          + New curriculum
        </Link>
      </div>

      <div className="mt-6">
        <Card title={`${curricula.length} curriculum${curricula.length === 1 ? "" : "a"}`}>
          {curricula.length === 0 ? (
            <p className="text-sm text-slate-500">No curricula yet.</p>
          ) : (
            <div className="space-y-2">
              {curricula.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/admin/learning/curriculum/${c.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 px-4 py-3 hover:border-slate-600"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.code} · {c.country} · {c._count.classLevels} class level
                      {c._count.classLevels === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                      c.isActive ? "border-green-800 text-green-400" : "border-slate-700 text-slate-500"
                    }`}
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
