import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ProgrammesPage() {
  const programmes = await prisma.programme.findMany({
    where: { published: true },
    include: { _count: { select: { courses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/learn" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Courses
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">Programmes</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        A Programme bundles several courses together — complete every course inside and earn a
        Programme certificate on top of each course&apos;s own.
      </p>

      {programmes.length === 0 ? (
        <p className="mt-8 text-sm text-text-secondary">No programmes are available yet.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {programmes.map((p) => (
            <Link
              key={p.id}
              href={`/learn/programmes/${p.id}`}
              className="block rounded-xl border border-border bg-surface-raised p-5 hover:border-border-strong"
            >
              <p className="font-medium text-text-primary">{p.title}</p>
              {p.description && <p className="mt-1 text-sm text-text-secondary">{p.description}</p>}
              <p className="mt-3 text-xs text-text-muted">
                {p._count.courses} course{p._count.courses === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
