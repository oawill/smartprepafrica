import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Badge } from "@/components/ui/badge";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

export default async function LoginActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; result?: string; page?: string }>;
}) {
  await requireAdminPagePermission("security.view");
  const { email, result, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const where: Prisma.LoginActivityWhereInput = {
    ...(email ? { email: { contains: email.trim(), mode: "insensitive" } } : {}),
    ...(result === "success" ? { success: true } : result === "failure" ? { success: false } : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.loginActivity.count({ where }),
    prisma.loginActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Login activity</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {total} attempts recorded. Passwords, OTPs, and tokens are never logged here.
      </p>

      <div className="mt-6">
        <Card title="Filter">
          <form className="flex gap-2">
            <input
              name="email"
              defaultValue={email}
              placeholder="Filter by email…"
              className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <select
              name="result"
              defaultValue={result ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              <option value="">Any result</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
            <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
              Filter
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${entries.length} on this page`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr>
                <th className="pb-2">When</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Result</th>
                <th className="pb-2">Failure reason</th>
                <th className="pb-2">Browser / device</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-surface-sunken/50">
                  <td className="py-2 text-text-muted">{new Date(e.createdAt).toLocaleString("en-NG")}</td>
                  <td className="py-2 text-text-secondary">{e.email}</td>
                  <td className="py-2">
                    <Badge tone={e.success ? "success" : "danger"}>{e.success ? "Success" : "Failed"}</Badge>
                  </td>
                  <td className="py-2 text-text-muted">{e.failureReason ?? "—"}</td>
                  <td className="max-w-xs truncate py-2 text-xs text-text-muted">{e.userAgent ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {totalPages > 1 && (
        <p className="mt-4 text-center text-sm text-text-muted">
          Page {page} of {totalPages}
        </p>
      )}
    </div>
  );
}
