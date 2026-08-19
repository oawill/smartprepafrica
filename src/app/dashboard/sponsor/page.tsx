import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { issueVoucher, createSponsorshipProgram, renewProgram } from "@/app/dashboard/sponsor/actions";
import { PLAN_LABELS } from "@/lib/plans";

const purchasablePlans = ["BASIC", "PREMIUM", "SCHOOL"] as const;

export default async function SponsorDashboard() {
  const session = await auth();
  if (!session) return null;

  const sponsor = await prisma.sponsorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!sponsor) redirect("/dashboard");

  const vouchers = await prisma.voucher.findMany({
    where: { sponsorId: sponsor.id },
    include: { redemption: true },
    orderBy: { createdAt: "desc" },
  });

  const redeemedUserIds = vouchers
    .map((v) => v.redemption?.userId)
    .filter((id): id is string => !!id);

  const [attempts, enrollments, certificateCount] = await Promise.all([
    redeemedUserIds.length
      ? prisma.examAttempt.findMany({
          where: { userId: { in: redeemedUserIds }, submittedAt: { not: null } },
          select: { score: true },
        })
      : Promise.resolve([]),
    redeemedUserIds.length
      ? prisma.courseEnrollment.findMany({
          where: { userId: { in: redeemedUserIds } },
          include: {
            course: { select: { modules: { select: { lessons: { select: { id: true } } } } } },
            lessonProgress: { where: { completedAt: { not: null } }, select: { lessonId: true } },
          },
        })
      : Promise.resolve([]),
    redeemedUserIds.length
      ? prisma.certificate.count({ where: { userId: { in: redeemedUserIds } } })
      : Promise.resolve(0),
  ]);

  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / attempts.length)
      : null;

  const completionRates = enrollments.map((e) => {
    const total = e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    return total > 0 ? e.lessonProgress.length / total : 0;
  });
  const avgCompletion =
    completionRates.length > 0
      ? Math.round((completionRates.reduce((a, b) => a + b, 0) / completionRates.length) * 100)
      : null;

  const redeemedCount = vouchers.filter((v) => v.status === "REDEEMED").length;

  const [programs, schools, subjects] = await Promise.all([
    prisma.sponsorshipProgram.findMany({
      where: { sponsorId: sponsor.id },
      include: {
        school: { select: { name: true } },
        subject: { select: { name: true } },
        vouchers: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.school.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Earn by helping students succeed.</h1>
      <p className="mt-1 text-sm text-slate-400">
        Issue vouchers, track redemptions, and see your impact.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Vouchers issued">
          <p className="text-3xl font-semibold">{vouchers.length}</p>
        </Card>
        <Card title="Vouchers redeemed">
          <p className="text-3xl font-semibold">{redeemedCount}</p>
        </Card>
        <Card title="Students impacted">
          <p className="text-3xl font-semibold">{redeemedUserIds.length}</p>
        </Card>
        <Card title="Avg exam score (redeemers)">
          <p className="text-3xl font-semibold">{avgScore !== null ? `${avgScore}%` : "—"}</p>
        </Card>
        <Card title="Avg course completion">
          <p className="text-3xl font-semibold">
            {avgCompletion !== null ? `${avgCompletion}%` : "—"}
          </p>
        </Card>
        <Card title="Certificates earned">
          <p className="text-3xl font-semibold">{certificateCount}</p>
        </Card>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Individual student identities aren&apos;t shown here to protect
        privacy — only aggregate outcomes across everyone who redeemed your
        vouchers.
      </p>

      <div className="mt-6">
        <Card title="Sponsorship programs">
          {programs.length === 0 ? (
            <p className="text-sm text-slate-400">No programs yet.</p>
          ) : (
            <div className="space-y-3">
              {programs.map((p) => {
                const redeemed = p.vouchers.filter((v) => v.status === "REDEEMED").length;
                const pct = p.totalSeats > 0 ? Math.round((redeemed / p.totalSeats) * 100) : 0;
                return (
                  <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-100">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {PLAN_LABELS[p.plan]} · {p.school?.name ?? "Open to any student"}
                          {p.subject && ` · ${p.subject.name}`} ·{" "}
                          {p.durationDays} day access
                        </p>
                      </div>
                      <p className="text-sm text-slate-300">
                        {redeemed} / {p.totalSeats} seats used
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
                    </div>
                    <form action={renewProgram} className="mt-3 flex items-end gap-2">
                      <input type="hidden" name="programId" value={p.id} />
                      <div>
                        <label className="block text-xs text-slate-400">Add seats</label>
                        <input
                          type="number"
                          name="additionalSeats"
                          min={1}
                          required
                          className="mt-1 w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
                      >
                        Renew
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}

          <form action={createSponsorshipProgram} className="mt-4 space-y-2 border-t border-slate-800 pt-4">
            <input
              type="text"
              name="name"
              required
              placeholder="Program name (e.g. Lagos Girls Scholarship)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <select
                name="plan"
                required
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              >
                {(["BASIC", "PREMIUM", "SCHOOL"] as const).map((plan) => (
                  <option key={plan} value={plan}>
                    {PLAN_LABELS[plan]}
                  </option>
                ))}
              </select>
              <select
                name="schoolId"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              >
                <option value="">Any school</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                name="subjectId"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              >
                <option value="">Any subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="totalSeats"
                min={1}
                required
                placeholder="Seats"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <input
                type="number"
                name="durationDays"
                min={1}
                required
                placeholder="Days"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Create program
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Issue a single voucher">
          <form action={issueVoucher} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400" htmlFor="plan">
                Plan
              </label>
              <select
                id="plan"
                name="plan"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              >
                {purchasablePlans.map((plan) => (
                  <option key={plan} value={plan}>
                    {PLAN_LABELS[plan]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400" htmlFor="expiryDays">
                Expires after (days, optional)
              </label>
              <input
                id="expiryDays"
                name="expiryDays"
                type="number"
                min={1}
                placeholder="No expiry"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Generate voucher
            </button>
          </form>
        </Card>

        <Card title="Your vouchers">
          {vouchers.length === 0 ? (
            <p className="text-sm text-slate-400">No vouchers issued yet.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-900 text-xs text-slate-500">
                  <tr>
                    <th className="pb-2">Code</th>
                    <th className="pb-2">Plan</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.id} className="border-t border-slate-800">
                      <td className="py-2 font-mono text-xs">{v.code}</td>
                      <td className="py-2 text-slate-400">{PLAN_LABELS[v.plan]}</td>
                      <td className="py-2">
                        <span
                          className={
                            v.status === "REDEEMED"
                              ? "text-green-400"
                              : v.status === "EXPIRED"
                                ? "text-slate-500"
                                : "text-orange-400"
                          }
                        >
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
