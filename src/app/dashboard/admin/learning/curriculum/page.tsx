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
          <p className="mt-1 text-sm text-text-secondary">
            The top of the learning hierarchy — a curriculum groups class levels (e.g. SS1–SS3), which
            courses are optionally tagged with for browsing.
          </p>
        </div>
        <Link
          href="/dashboard/admin/learning/curriculum/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          + New curriculum
        </Link>
      </div>

      <div className="mt-6">
        <Card title={`${curricula.length} curriculum${curricula.length === 1 ? "" : "a"}`}>
          {curricula.length === 0 ? (
            <p className="text-sm text-text-muted">No curricula yet.</p>
          ) : (
            <div className="space-y-2">
              {curricula.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/admin/learning/curriculum/${c.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 hover:border-border-strong"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.name}</p>
                    <p className="text-xs text-text-muted">
                      {c.code} · {c.country} · {c._count.classLevels} class level
                      {c._count.classLevels === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                      c.isActive ? "border-success/40 text-success" : "border-border-strong text-text-muted"
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
