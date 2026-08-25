import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { roleFromSlug, ROLE_SLUG_LABEL } from "@/lib/admin/user-role-slug";
import { UserBulkTable, type BulkUserRow } from "@/components/admin/user-bulk-table";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function AdminUsersByRolePage({
  params,
  searchParams,
}: {
  params: Promise<{ roleSlug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdminPagePermission("users.view");
  const { roleSlug } = await params;
  const role = roleFromSlug(roleSlug);
  const label = ROLE_SLUG_LABEL[roleSlug];

  const { q: qRaw, page: pageRaw } = await searchParams;
  const q = qRaw?.trim();
  const page = Math.max(1, Number(pageRaw) || 1);

  const where: Prisma.UserWhereInput = {
    role,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { studentNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        studentProfile: { include: { school: { select: { name: true } } } },
        teacherProfile: { include: { school: { select: { name: true } } } },
        schoolAdminOf: { select: { name: true } },
        sponsorProfile: true,
        parentLinks: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canBulkUpdate = hasPermission(session.user.adminRole, "users.suspend");

  const rows: BulkUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    studentNumber: u.studentNumber,
    detail:
      u.studentProfile?.school?.name ??
      u.teacherProfile?.school?.name ??
      u.schoolAdminOf[0]?.name ??
      u.sponsorProfile?.organization ??
      (u.parentLinks.length > 0 ? `${u.parentLinks.length} linked child(ren)` : "—"),
  }));

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">{label}</h1>
      <p className="mt-1 text-sm text-text-secondary">{total} total.</p>

      <div className="mt-6">
        <Card title="Search">
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, email, ID…"
              className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${users.length} on this page`}>
          <UserBulkTable users={rows} roleSlug={roleSlug} canBulkUpdate={canBulkUpdate} />
        </Card>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Link
            href={`/dashboard/admin/users/${roleSlug}?page=${Math.max(1, page - 1)}${q ? `&q=${q}` : ""}`}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-text-secondary hover:border-text-muted"
          >
            ← Prev
          </Link>
          <span className="text-text-muted">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/dashboard/admin/users/${roleSlug}?page=${Math.min(totalPages, page + 1)}${q ? `&q=${q}` : ""}`}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-text-secondary hover:border-text-muted"
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
