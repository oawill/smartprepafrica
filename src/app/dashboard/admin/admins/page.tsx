import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission, ADMIN_ROLE_LABELS } from "@/lib/admin/permissions";
import { CreateAdminForm } from "@/components/admin/create-admin-form";
import { changeAdminRole, disableAdmin, reenableAdmin, revokeAdminSessions } from "@/app/dashboard/admin/admins/actions";
import type { AdminRole } from "@prisma/client";

export default async function AdminAdminsPage() {
  const session = await requireAdminPagePermission("admins.create");
  const canManageRoles = hasPermission(session.user.adminRole, "roles.manage");
  const canRevoke = hasPermission(session.user.adminRole, "sessions.revoke");

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true, adminRole: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Administrators</h1>
      <p className="mt-1 text-sm text-slate-400">
        Only Super Admins can add or manage other administrators. Every action here is audit-logged.
      </p>

      <div className="mt-6">
        <Card title="Add administrator">
          <CreateAdminForm />
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${admins.length} administrators`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Admin role</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-t border-slate-800">
                  <td className="py-2">{a.name}</td>
                  <td className="py-2 text-slate-400">{a.email}</td>
                  <td className="py-2">
                    {canManageRoles ? (
                      <form action={changeAdminRole} className="inline-flex gap-1">
                        <input type="hidden" name="userId" value={a.id} />
                        <select
                          name="adminRole"
                          defaultValue={a.adminRole ?? ""}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-orange-500"
                        >
                          <option value="" disabled>
                            No role
                          </option>
                          {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map((role) => (
                            <option key={role} value={role}>
                              {ADMIN_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500">
                          Save
                        </button>
                      </form>
                    ) : (
                      (a.adminRole && ADMIN_ROLE_LABELS[a.adminRole]) ?? "No role assigned"
                    )}
                  </td>
                  <td className={`py-2 ${a.status === "ACTIVE" ? "text-green-400" : "text-red-400"}`}>{a.status}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {canRevoke && (
                        <form action={revokeAdminSessions}>
                          <input type="hidden" name="userId" value={a.id} />
                          <button type="submit" className="rounded-lg border border-amber-800 px-2 py-1 text-xs text-amber-400 hover:border-amber-600">
                            Revoke sessions
                          </button>
                        </form>
                      )}
                      {a.status === "ACTIVE" ? (
                        <form action={disableAdmin}>
                          <input type="hidden" name="userId" value={a.id} />
                          <button
                            type="submit"
                            disabled={a.id === session.user.id}
                            className="rounded-lg border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-700 disabled:opacity-40"
                          >
                            Disable
                          </button>
                        </form>
                      ) : (
                        <form action={reenableAdmin}>
                          <input type="hidden" name="userId" value={a.id} />
                          <button type="submit" className="rounded-lg border border-green-800 px-2 py-1 text-xs text-green-400 hover:border-green-600">
                            Re-enable
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
