import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { setLeaderboardOptIn } from "@/app/dashboard/student/actions";

const TOP_N = 20;

export default async function StudentLeaderboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, schoolId: true, leaderboardOptIn: true, xp: true },
  });
  if (!studentProfile) redirect("/dashboard");

  if (!studentProfile.schoolId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Leaderboards are scoped to your school, and your account isn&apos;t linked to one yet.
        </p>
      </div>
    );
  }

  if (!studentProfile.leaderboardOptIn) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-2 text-sm text-text-secondary">
          See how you rank against other students at your school, by XP earned. Joining is
          entirely optional — only students who opt in appear on the list, and if you&apos;re not
          in the top {TOP_N}, your own rank is only ever shown to you, never to anyone else.
        </p>
        <form action={setLeaderboardOptIn} className="mt-4">
          <input type="hidden" name="leaderboardOptIn" value="on" />
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Join the leaderboard
          </button>
        </form>
      </div>
    );
  }

  const schoolStudents = await prisma.studentProfile.findMany({
    where: { schoolId: studentProfile.schoolId, leaderboardOptIn: true },
    select: { id: true, xp: true, user: { select: { name: true } } },
    orderBy: { xp: "desc" },
  });

  const top = schoolStudents.slice(0, TOP_N);
  const myPosition = schoolStudents.findIndex((s) => s.id === studentProfile.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">School leaderboard</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Top {TOP_N} opted-in students at your school, ranked by XP.
      </p>

      <div className="mt-6">
        <Card title="Top students">
          {top.length === 0 ? (
            <p className="text-sm text-text-secondary">No one has joined the leaderboard yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2">#</th>
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Level</th>
                  <th className="pb-2">XP</th>
                </tr>
              </thead>
              <tbody>
                {top.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-t border-border text-text-primary ${s.id === studentProfile.id ? "bg-brand/10" : ""}`}
                  >
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2">{s.user.name}</td>
                    <td className="py-2 text-text-secondary">{Math.floor(s.xp / 100) + 1}</td>
                    <td className="py-2 font-semibold">{s.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {myPosition >= TOP_N && (
          <p className="mt-3 text-xs text-text-muted">
            Your rank: #{myPosition + 1} of {schoolStudents.length}. Only you can see this — the
            public list above never shows below #{TOP_N}.
          </p>
        )}

        <form action={setLeaderboardOptIn} className="mt-4">
          <button type="submit" className="text-xs text-text-secondary hover:text-danger">
            Leave the leaderboard
          </button>
        </form>
      </div>
    </div>
  );
}
