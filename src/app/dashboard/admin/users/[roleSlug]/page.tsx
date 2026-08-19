import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { roleFromSlug, ROLE_SLUG_LABEL } from "@/lib/admin/user-role-slug";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

const statusColor: Record<string, string> = {
  ACTIVE: "text-green-400",
  SUSPENDED: "text-red-400",
  LOCKED: "text-red-500",
  PENDING_VERIFICATION: "text-amber-400",
  CLOSED: "text-slate-600",
};

export default async function AdminUsersByRolePage({
  params,
  searchParams,
}: {
  params: Promise<{ roleSlug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminPagePermission("users.view");
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

  return (
    <div>
      <h1 className="text-2xl font-semibold">{label}</h1>
      <p className="mt-1 text-sm text-slate-400">{total} total.</p>

      <div className="mt-6">
        <Card title="Search">
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, email, ID…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button type="submit" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500">
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${users.length} on this page`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Detail</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const detail =
                  u.studentProfile?.school?.name ??
                  u.teacherProfile?.school?.name ??
                  u.schoolAdminOf[0]?.name ??
                  u.sponsorProfile?.organization ??
                  (u.parentLinks.length > 0 ? `${u.parentLinks.length} linked child(ren)` : "—");
                return (
                  <tr key={u.id} className="border-t border-slate-800">
                    <td className="py-2">
                      {u.name}
                      {u.studentNumber && (
                        <span className="ml-2 font-mono text-xs text-slate-500">{u.studentNumber}</span>
                      )}
                    </td>
                    <td className="py-2 text-slate-400">{u.email}</td>
                    <td className="py-2 text-slate-400">{detail}</td>
                    <td className={`py-2 ${statusColor[u.status] ?? ""}`}>{u.status}</td>
                    <td className="py-2 text-right">
                      <Link href={`/dashboard/admin/users/${roleSlug}/${u.id}`} className="text-xs text-orange-400 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Link
            href={`/dashboard/admin/users/${roleSlug}?page=${Math.max(1, page - 1)}${q ? `&q=${q}` : ""}`}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-slate-500"
          >
            ← Prev
          </Link>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/dashboard/admin/users/${roleSlug}?page=${Math.min(totalPages, page + 1)}${q ? `&q=${q}` : ""}`}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-slate-500"
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
