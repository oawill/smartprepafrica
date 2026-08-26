import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import { requestChildLink } from "@/app/dashboard/parent/actions";

export default async function ParentDashboard() {
  const session = await auth();
  if (!session) return null;

  const [links, pendingRequests, payments] = await Promise.all([
    prisma.parentStudentLink.findMany({
      where: { parentId: session.user.id, status: "ACTIVE" },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            school: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.parentStudentLink.findMany({
      where: { parentId: session.user.id, status: "PENDING" },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Parent dashboard</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Monitor your child&apos;s exam prep and course progress in one place.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Linked children">
          {links.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No children linked yet. Ask your child for their parent link code
              from their dashboard, then enter it below.
            </p>
          ) : (
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.id}>
                  <Link
                    href={`/dashboard/parent/children/${link.studentId}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:border-border-strong"
                  >
                    <span>
                      <span className="font-medium text-text-primary">
                        {link.student.user.name}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {link.student.school?.name ?? "No school"}
                        {link.student.class ? ` · ${link.student.class.name}` : ""}
                      </span>
                    </span>
                    <span className="text-brand-text">View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {pendingRequests.length > 0 && (
            <ul className="mt-3 space-y-2">
              {pendingRequests.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm"
                >
                  <span className="text-text-secondary">{req.student.user.name}</span>
                  <Badge tone="warning">Awaiting approval</Badge>
                </li>
              ))}
            </ul>
          )}

          <form action={requestChildLink} className="mt-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                name="linkCode"
                required
                placeholder="Child's link code (e.g. SPA-TUN-74921)"
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Request link
              </button>
            </div>
            <input
              type="text"
              name="relationship"
              placeholder="Your relationship (e.g. Mother, Guardian) — optional"
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <p className="text-xs text-text-muted">
              Your child will need to approve this request before you can see their progress.
            </p>
          </form>
        </Card>

        <Card title="Payment history">
          {payments.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No payments yet. Purchase a subscription or sponsor your
              child&apos;s access from their profile page.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between text-text-secondary">
                  <span>{p.createdAt.toLocaleDateString()}</span>
                  <span className="text-text-muted">
                    ₦{(p.amountKobo / 100).toLocaleString()} · {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
