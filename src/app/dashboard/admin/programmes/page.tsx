import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";

export default async function AdminProgrammesPage() {
  await requireAdminPagePermission("programmes.view");

  const programmes = await prisma.programme.findMany({
    include: { _count: { select: { courses: true, certificates: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">Programmes</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Curated bundles of existing courses — a learner earns a Programme certificate once every
            member course is completed.
          </p>
        </div>
        <Link
          href="/dashboard/admin/programmes/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          + New programme
        </Link>
      </div>

      <div className="mt-6">
        <Card title={`${programmes.length} programme${programmes.length === 1 ? "" : "s"}`}>
          {programmes.length === 0 ? (
            <p className="text-sm text-text-muted">No programmes yet.</p>
          ) : (
            <div className="space-y-2">
              {programmes.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/admin/programmes/${p.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 hover:border-border-strong"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{p.title}</p>
                    <p className="text-xs text-text-muted">
                      {p._count.courses} course{p._count.courses === 1 ? "" : "s"} · {p._count.certificates}{" "}
                      certificate{p._count.certificates === 1 ? "" : "s"} issued
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                      p.published ? "border-success/40 text-success" : "border-border-strong text-text-muted"
                    }`}
                  >
                    {p.published ? "Published" : "Draft"}
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
