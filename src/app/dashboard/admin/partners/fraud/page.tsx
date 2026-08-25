import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { resolveFraudFlag } from "@/app/dashboard/admin/partners/fraud/actions";

export default async function AdminFraudReviewPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const openFlags = await prisma.partnerFraudFlag.findMany({
    where: { status: { in: ["OPEN", "REVIEWING"] } },
    include: { partner: { select: { firstName: true, lastName: true, partnerNumber: true } } },
    orderBy: { createdAt: "asc" },
  });

  const resolvedFlags = await prisma.partnerFraudFlag.findMany({
    where: { status: { in: ["CONFIRMED", "DISMISSED"] } },
    include: { partner: { select: { firstName: true, lastName: true, partnerNumber: true } } },
    orderBy: { resolvedAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Partner fraud review</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Suspicious referral activity is flagged, never auto-blocked or deleted. Review and decide.
      </p>

      <div className="mt-6">
        <Card title={`Open flags (${openFlags.length})`}>
          {openFlags.length === 0 ? (
            <p className="text-sm text-text-secondary">No open fraud flags.</p>
          ) : (
            <div className="space-y-3">
              {openFlags.map((f) => (
                <div key={f.id} className="rounded-lg border border-warning/40 bg-warning-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-text-primary">
                        <Link
                          href={`/dashboard/admin/partners/${f.partnerId}`}
                          className="text-brand-text hover:underline"
                        >
                          {f.partner.firstName} {f.partner.lastName}
                        </Link>{" "}
                        ({f.partner.partnerNumber})
                      </p>
                      <p className="text-xs text-text-muted">{f.reason}</p>
                    </div>
                    <span className="text-xs text-warning">{f.status}</span>
                  </div>
                  {f.details && <p className="mt-2 text-sm text-text-secondary">{f.details}</p>}
                  <form action={resolveFraudFlag} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="flagId" value={f.id} />
                    <input
                      name="reviewNote"
                      placeholder="Review note (optional)"
                      className="flex-1 min-w-[200px] rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                    />
                    <button
                      type="submit"
                      name="decision"
                      value="DISMISSED"
                      className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
                    >
                      Dismiss (false positive)
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="CONFIRMED"
                      className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:border-danger"
                    >
                      Confirm fraud
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Recently resolved">
          {resolvedFlags.length === 0 ? (
            <p className="text-sm text-text-secondary">No resolved flags yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2">Partner</th>
                  <th className="pb-2">Reason</th>
                  <th className="pb-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {resolvedFlags.map((f) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="py-2 text-text-primary">
                      {f.partner.firstName} {f.partner.lastName}
                    </td>
                    <td className="py-2 text-text-secondary">{f.reason}</td>
                    <td className="py-2">
                      <span className={f.status === "CONFIRMED" ? "text-danger" : "text-text-muted"}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
