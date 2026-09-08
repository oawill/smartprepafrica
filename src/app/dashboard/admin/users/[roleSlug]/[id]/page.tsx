import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { roleFromSlug, ROLE_SLUG_LABEL } from "@/lib/admin/user-role-slug";
import { roleLabel } from "@/lib/roles";
import {
  suspendUser,
  reactivateUser,
  forceSignOut,
  setTeacherApplicationStatus,
} from "@/app/dashboard/admin/users/actions";
import { grantAdditionalRole } from "@/app/dashboard/admin/actions";

const ALL_ROLES: Role[] = ["STUDENT", "PARENT", "TEACHER", "SCHOOL_ADMIN", "SPONSOR", "PARTNER", "ADMIN"];

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
      parentLinks: {
        where: { status: "ACTIVE" },
        include: { student: { include: { user: { select: { name: true } } } } },
      },
      examAttempts: { select: { id: true, submittedAt: true }, take: 1000 },
      enrollments: { select: { id: true, status: true }, take: 1000 },
      subscriptions: {
        select: { id: true, plan: true, status: true, expiresAt: true },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
      roles: { select: { role: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!user || user.role !== role) notFound();

  const redirectTo = `/dashboard/admin/users/${roleSlug}/${id}`;
  const canSuspend = hasPermission(session.user.adminRole, "users.suspend");
  const canRevoke = hasPermission(session.user.adminRole, "sessions.revoke");
  const canManageRoles = hasPermission(session.user.adminRole, "roles.manage");
  const canApproveTeachers = hasPermission(session.user.adminRole, "teachers.approve");
  const heldRoles = new Set(user.roles.map((r) => r.role));
  const grantableRoles = ALL_ROLES.filter((r) => !heldRoles.has(r));

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {user.email} · {ROLE_SLUG_LABEL[roleSlug]}
            {user.studentNumber && ` · ${user.studentNumber}`} ·{" "}
            <span
              className={
                user.status === "ACTIVE"
                  ? "text-success"
                  : user.status === "SUSPENDED" || user.status === "LOCKED"
                    ? "text-danger"
                    : "text-warning"
              }
            >
              {user.status}
            </span>
          </p>
          {user.statusReason && <p className="mt-1 text-xs text-text-muted">Reason on file: {user.statusReason}</p>}
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
                className="w-44 rounded-lg border border-border-strong bg-surface px-2 py-2 text-xs outline-none placeholder:text-text-muted focus:border-brand"
              />
              <button type="submit" className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger hover:border-danger">
                Suspend
              </button>
            </form>
          )}
          {canSuspend && user.status !== "ACTIVE" && (
            <form action={reactivateUser}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button type="submit" className="rounded-lg border border-success/40 px-3 py-2 text-xs text-success hover:border-success">
                Reactivate
              </button>
            </form>
          )}
          {canRevoke && (
            <form action={forceSignOut}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button type="submit" className="rounded-lg border border-warning/40 px-3 py-2 text-xs text-warning hover:border-warning">
                Force sign-out (all devices)
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {user.studentProfile && (
          <Card title="Student profile">
            <p className="text-sm text-text-secondary">School: {user.studentProfile.school?.name ?? "—"}</p>
            <p className="text-sm text-text-secondary">Class: {user.studentProfile.class?.name ?? "—"}</p>
            <p className="text-sm text-text-secondary">Grade: {user.studentProfile.gradeLevel ?? "—"}</p>
          </Card>
        )}
        {user.teacherProfile && (
          <Card title="Teacher profile">
            <p className="text-sm text-text-secondary">School: {user.teacherProfile.school?.name ?? "—"}</p>
            <p className="text-sm text-text-secondary">Years experience: {user.teacherProfile.yearsExperience ?? "—"}</p>
            <p className="text-sm text-text-secondary">
              Application status:{" "}
              <span
                className={
                  user.teacherProfile.applicationStatus === "APPROVED"
                    ? "text-success"
                    : user.teacherProfile.applicationStatus === "REJECTED"
                      ? "text-danger"
                      : "text-warning"
                }
              >
                {user.teacherProfile.applicationStatus}
              </span>
            </p>
            {canApproveTeachers && user.teacherProfile.applicationStatus !== "APPROVED" && (
              <form action={setTeacherApplicationStatus} className="mt-2 flex gap-2">
                <input type="hidden" name="teacherProfileId" value={user.teacherProfile.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button
                  type="submit"
                  name="status"
                  value="APPROVED"
                  className="rounded-lg border border-success/40 px-3 py-1.5 text-xs text-success hover:bg-success-surface"
                >
                  Approve
                </button>
                <button
                  type="submit"
                  name="status"
                  value="REJECTED"
                  className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger-surface"
                >
                  Reject
                </button>
              </form>
            )}
          </Card>
        )}
        {user.schoolAdminOf.length > 0 && (
          <Card title="Administers">
            <ul className="text-sm text-text-secondary">
              {user.schoolAdminOf.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          </Card>
        )}
        {user.sponsorProfile && (
          <Card title="Sponsor profile">
            <p className="text-sm text-text-secondary">Organization: {user.sponsorProfile.organization ?? "—"}</p>
          </Card>
        )}
        {user.parentLinks.length > 0 && (
          <Card title="Linked children">
            <ul className="text-sm text-text-secondary">
              {user.parentLinks.map((l) => (
                <li key={l.id}>{l.student.user.name}</li>
              ))}
            </ul>
          </Card>
        )}
        <Card title="Activity">
          <p className="text-sm text-text-secondary">Exam attempts: {user.examAttempts.length}</p>
          <p className="text-sm text-text-secondary">Course enrollments: {user.enrollments.length}</p>
        </Card>
        <Card title="Workspaces">
          <ul className="text-sm text-text-secondary">
            {user.roles.map((r) => (
              <li key={r.role}>
                {roleLabel[r.role]}
                {r.role === user.role && <span className="ml-1 text-xs text-brand-text">(active)</span>}
              </li>
            ))}
          </ul>
          {canManageRoles && grantableRoles.length > 0 && (
            <form action={grantAdditionalRole} className="mt-3 flex gap-2">
              <input type="hidden" name="userId" value={user.id} />
              <select
                name="role"
                required
                className="flex-1 rounded-lg border border-border-strong bg-surface px-2 py-2 text-xs text-text-primary outline-none focus:border-brand"
              >
                {grantableRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel[r]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
              >
                Grant workspace
              </button>
            </form>
          )}
        </Card>
        <Card title="Subscription">
          {user.subscriptions[0] ? (
            <>
              <p className="text-sm text-text-secondary">Plan: {user.subscriptions[0].plan}</p>
              <p className="text-sm text-text-secondary">Status: {user.subscriptions[0].status}</p>
              {user.subscriptions[0].expiresAt && (
                <p className="text-sm text-text-secondary">
                  Expires: {new Date(user.subscriptions[0].expiresAt).toLocaleDateString("en-NG")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">No subscription on record.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
