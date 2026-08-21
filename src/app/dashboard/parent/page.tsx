import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { linkChild } from "@/app/dashboard/parent/actions";

export default async function ParentDashboard() {
  const session = await auth();
  if (!session) return null;

  const [links, payments] = await Promise.all([
    prisma.parentStudentLink.findMany({
      where: { parentId: session.user.id },
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
    prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Parent dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Monitor your child&apos;s exam prep and course progress in one place.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Linked children">
          {links.length === 0 ? (
            <p className="text-sm text-slate-400">
              No children linked yet. Add a child using their student email
              below to start monitoring progress.
            </p>
          ) : (
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.id}>
                  <Link
                    href={`/dashboard/parent/children/${link.studentId}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm hover:border-slate-600"
                  >
                    <span>
                      <span className="font-medium text-slate-100">
                        {link.student.user.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {link.student.school?.name ?? "No school"}
                        {link.student.class ? ` · ${link.student.class.name}` : ""}
                      </span>
                    </span>
                    <span className="text-orange-400">View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <form action={linkChild} className="mt-4 flex gap-2">
            <input
              type="email"
              name="childEmail"
              required
              placeholder="Child's student email"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Link child
            </button>
          </form>
        </Card>

        <Card title="Payment history">
          {payments.length === 0 ? (
            <p className="text-sm text-slate-400">
              No payments yet. Purchase a subscription or sponsor your
              child&apos;s access from their profile page.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between text-slate-300">
                  <span>{p.createdAt.toLocaleDateString()}</span>
                  <span className="text-slate-500">
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
