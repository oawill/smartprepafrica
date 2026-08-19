import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { roleFromSlug, ROLE_SLUG_LABEL } from "@/lib/admin/user-role-slug";
import { suspendUser, reactivateUser, forceSignOut } from "@/app/dashboard/admin/users/actions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ roleSlug: string; id: string }>;
}) {
  const session = await requireAdminPagePermission("users.view");
  const { roleSlug, id } = await params;
  const role = roleFromSlug(roleSlug);

  const user = await prisma.user.findUnique({
    where: { id },
    // Never select passwordHash — this page must never be able to expose it.
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      statusReason: true,
      statusChangedAt: true,
      studentNumber: true,
      createdAt: true,
      studentProfile: {
        include: {
          school: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
      teacherProfile: { include: { school: { select: { name: true } } } },
      schoolAdminOf: { select: { id: true, name: true } },
      sponsorProfile: true,
      parentLinks: { include: { student: { include: { user: { select: { name: true } } } } } },
      examAttempts: { select: { id: true, submittedAt: true }, take: 1000 },
      enrollments: { select: { id: true, status: true }, take: 1000 },
      subscriptions: {
        select: { id: true, plan: true, status: true, expiresAt: true },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!user || user.role !== role) notFound();

  const redirectTo = `/dashboard/admin/users/${roleSlug}/${id}`;
  const canSuspend = hasPermission(session.user.adminRole, "users.suspend");
  const canRevoke = hasPermission(session.user.adminRole, "sessions.revoke");

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {user.email} · {ROLE_SLUG_LABEL[roleSlug]}
            {user.studentNumber && ` · ${user.studentNumber}`} ·{" "}
            <span
              className={
                user.status === "ACTIVE"
                  ? "text-green-400"
                  : user.status === "SUSPENDED" || user.status === "LOCKED"
                    ? "text-red-400"
                    : "text-amber-400"
              }
            >
              {user.status}
            </span>
          </p>
          {user.statusReason && <p className="mt-1 text-xs text-slate-500">Reason on file: {user.statusReason}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canSuspend && user.status === "ACTIVE" && (
            <form action={suspendUser} className="flex gap-1">
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input
                name="reason"
                placeholder="Reason to suspend…"
                required
                className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs outline-none focus:border-orange-500"
              />
              <button type="submit" className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 hover:border-red-700">
                Suspend
              </button>
            </form>
          )}
          {canSuspend && user.status !== "ACTIVE" && (
            <form action={reactivateUser}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button type="submit" className="rounded-lg border border-green-800 px-3 py-2 text-xs text-green-400 hover:border-green-600">
                Reactivate
              </button>
            </form>
          )}
          {canRevoke && (
            <form action={forceSignOut}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button type="submit" className="rounded-lg border border-amber-800 px-3 py-2 text-xs text-amber-400 hover:border-amber-600">
                Force sign-out (all devices)
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {user.studentProfile && (
          <Card title="Student profile">
            <p className="text-sm text-slate-300">School: {user.studentProfile.school?.name ?? "—"}</p>
            <p className="text-sm text-slate-300">Class: {user.studentProfile.class?.name ?? "—"}</p>
            <p className="text-sm text-slate-300">Grade: {user.studentProfile.gradeLevel ?? "—"}</p>
          </Card>
        )}
        {user.teacherProfile && (
          <Card title="Teacher profile">
            <p className="text-sm text-slate-300">School: {user.teacherProfile.school?.name ?? "—"}</p>
            <p className="text-sm text-slate-300">Years experience: {user.teacherProfile.yearsExperience ?? "—"}</p>
          </Card>
        )}
        {user.schoolAdminOf.length > 0 && (
          <Card title="Administers">
            <ul className="text-sm text-slate-300">
              {user.schoolAdminOf.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          </Card>
        )}
        {user.sponsorProfile && (
          <Card title="Sponsor profile">
            <p className="text-sm text-slate-300">Organization: {user.sponsorProfile.organization ?? "—"}</p>
          </Card>
        )}
        {user.parentLinks.length > 0 && (
          <Card title="Linked children">
            <ul className="text-sm text-slate-300">
              {user.parentLinks.map((l) => (
                <li key={l.id}>{l.student.user.name}</li>
              ))}
            </ul>
          </Card>
        )}
        <Card title="Activity">
          <p className="text-sm text-slate-300">Exam attempts: {user.examAttempts.length}</p>
          <p className="text-sm text-slate-300">Course enrollments: {user.enrollments.length}</p>
        </Card>
        <Card title="Subscription">
          {user.subscriptions[0] ? (
            <>
              <p className="text-sm text-slate-300">Plan: {user.subscriptions[0].plan}</p>
              <p className="text-sm text-slate-300">Status: {user.subscriptions[0].status}</p>
              {user.subscriptions[0].expiresAt && (
                <p className="text-sm text-slate-300">
                  Expires: {new Date(user.subscriptions[0].expiresAt).toLocaleDateString("en-NG")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">No subscription on record.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
