import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { upsertTier } from "@/app/dashboard/admin/partners/tiers/actions";

export default async function AdminTiersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const tiers = await prisma.partnerTier.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Partner tiers</h1>
      <p className="mt-1 text-sm text-slate-400">
        A partner's tier is always computed live from their current qualified-paid-student count
        — changing a threshold here never leaves stale data.
      </p>

      <div className="mt-6 space-y-4">
        {tiers.map((tier) => (
          <Card key={tier.id} title={tier.name}>
            <form action={upsertTier} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <input type="hidden" name="name" value={tier.name} />
              <div>
                <label className="text-xs text-slate-500">Min paid students</label>
                <input
                  name="minPaidStudents"
                  type="number"
                  defaultValue={tier.minPaidStudents}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Sort order</label>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={tier.sortOrder}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Bonus %</label>
                <input
                  name="bonusPercentage"
                  type="number"
                  step="0.1"
                  defaultValue={tier.bonusPercentage}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Perks</label>
                <input
                  name="perks"
                  defaultValue={tier.perks ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="submit"
                className="col-span-2 sm:col-span-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
              >
                Save
              </button>
            </form>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card title="Add a new tier">
          <form action={upsertTier} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              name="name"
              placeholder="Tier name"
              required
              className="col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="minPaidStudents"
              type="number"
              placeholder="Min paid students"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="sortOrder"
              type="number"
              placeholder="Sort order"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="bonusPercentage"
              type="number"
              step="0.1"
              placeholder="Bonus %"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="perks"
              placeholder="Perks"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="col-span-2 sm:col-span-4 rounded-lg border border-orange-700 px-4 py-2 text-sm text-orange-300 hover:border-orange-500"
            >
              Add tier
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
