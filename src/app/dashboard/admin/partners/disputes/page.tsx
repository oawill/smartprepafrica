import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { resolveDispute } from "@/app/dashboard/admin/partners/disputes/actions";

export default async function AdminDisputesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const openDisputes = await prisma.partnerSchoolDispute.findMany({
    where: { status: "OPEN" },
    include: {
      school: { select: { name: true } },
      incumbentPartner: { select: { firstName: true, lastName: true, partnerNumber: true } },
      challengerPartner: { select: { firstName: true, lastName: true, partnerNumber: true } },
      challengerLead: { select: { leadNumber: true, contactName: true, createdAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const resolvedDisputes = await prisma.partnerSchoolDispute.findMany({
    where: { status: { not: "OPEN" } },
    include: {
      school: { select: { name: true } },
      incumbentPartner: { select: { firstName: true, lastName: true } },
      challengerPartner: { select: { firstName: true, lastName: true } },
    },
    orderBy: { resolvedAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">School attribution disputes</h1>
      <p className="mt-1 text-sm text-slate-400">
        A school&apos;s partner attribution is never overwritten automatically — these are cases
        where a second partner&apos;s lead reached School Registered for a school another partner
        is already attributed to.
      </p>

      <div className="mt-6">
        <Card title={`Open disputes (${openDisputes.length})`}>
          {openDisputes.length === 0 ? (
            <p className="text-sm text-slate-400">No open disputes.</p>
          ) : (
            <div className="space-y-3">
              {openDisputes.map((d) => (
                <div key={d.id} className="rounded-lg border border-amber-900 p-4">
                  <p className="font-medium">{d.school.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Incumbent: {d.incumbentPartner.firstName} {d.incumbentPartner.lastName} (
                    {d.incumbentPartner.partnerNumber})
                  </p>
                  <p className="text-xs text-slate-500">
                    Challenger: {d.challengerPartner.firstName} {d.challengerPartner.lastName} (
                    {d.challengerPartner.partnerNumber}) — lead {d.challengerLead.leadNumber}, first
                    submitted {new Date(d.challengerLead.createdAt).toLocaleDateString("en-NG")}
                  </p>
                  <form action={resolveDispute} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="disputeId" value={d.id} />
                    <input
                      name="resolution"
                      placeholder="Decision note"
                      className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      name="decision"
                      value="INCUMBENT"
                      className="rounded-lg border border-green-800 px-3 py-1.5 text-xs text-green-400 hover:border-green-600"
                    >
                      Keep incumbent
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="CHALLENGER"
                      className="rounded-lg border border-blue-800 px-3 py-1.5 text-xs text-blue-400 hover:border-blue-600"
                    >
                      Reassign to challenger
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Resolved">
          {resolvedDisputes.length === 0 ? (
            <p className="text-sm text-slate-400">No disputes resolved yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">School</th>
                  <th className="pb-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {resolvedDisputes.map((d) => (
                  <tr key={d.id} className="border-t border-slate-800">
                    <td className="py-2">{d.school.name}</td>
                    <td className="py-2 text-slate-400">{d.status}</td>
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
