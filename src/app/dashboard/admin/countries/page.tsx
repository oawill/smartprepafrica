import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { PLAN_LABELS, PLAN_PRICING_KOBO, formatMoney } from "@/lib/plans";
import {
  createCountry,
  updateCountryStatus,
  upsertCountryPlanPrice,
  clearCountryPlanPrice,
} from "@/app/dashboard/admin/countries/actions";

const PURCHASABLE_PLANS = Object.keys(PLAN_PRICING_KOBO) as SubscriptionPlan[];

const inputClass =
  "rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  CONTENT_SETUP: "info",
  TESTING: "warning",
  ACTIVE: "success",
  PAUSED: "danger",
};

const STATUSES = ["DRAFT", "CONTENT_SETUP", "TESTING", "ACTIVE", "PAUSED"] as const;

export default async function AdminCountriesPage() {
  await requireAdminPagePermission("countries.manage");

  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, schools: true, countryExams: true } } },
  });

  const planPriceRows = await prisma.countryPlanPrice.findMany();
  const overrideByCountryAndPlan = new Map(
    planPriceRows.map((row) => [`${row.countryId}:${row.plan}`, row])
  );

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Countries</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Countries stay hidden from students until their status is Active. This is the rollout gate
        for expanding SmartPrepAfrica beyond Nigeria.
      </p>

      <div className="mt-6">
        <Card title="Add country">
          <form action={createCountry} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input name="name" placeholder="Name, e.g. Ghana" required className={inputClass} />
            <input name="code" placeholder="Code, e.g. GH" required maxLength={2} className={inputClass} />
            <input name="currency" placeholder="Currency, e.g. GHS" required className={inputClass} />
            <input name="currencySymbol" placeholder="Symbol, e.g. ₵" required className={inputClass} />
            <input name="flag" placeholder="Flag emoji, e.g. 🇬🇭" required className={inputClass} />
            <input name="timezone" placeholder="Timezone, e.g. Africa/Accra" required className={inputClass} />
            <button
              type="submit"
              className="col-span-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover sm:col-span-3"
            >
              Add country
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="All countries">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2 pr-3">Country</th>
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Currency</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Users</th>
                  <th className="pb-2">Change status</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((country) => (
                  <tr key={country.id} className="border-t border-border">
                    <td className="py-2 pr-3 text-text-primary">
                      {country.flag} {country.name}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{country.code}</td>
                    <td className="py-2 pr-3 text-text-secondary">
                      {country.currencySymbol} {country.currency}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={STATUS_TONE[country.status]}>{country.status.replaceAll("_", " ")}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{country._count.users}</td>
                    <td className="py-2">
                      <form action={updateCountryStatus} className="flex gap-2">
                        <input type="hidden" name="id" value={country.id} />
                        <select name="status" defaultValue={country.status} className={inputClass}>
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
                        >
                          Update
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Plan pricing by country">
          <p className="mb-4 text-xs text-text-secondary">
            Monthly billing only — annual pricing isn&apos;t configurable per-country yet. A country
            with no override for a plan falls back to the Nigeria default shown below, in Naira,
            even for non-Nigeria countries — set an override in the country&apos;s own currency
            before activating it for students.
          </p>
          <div className="space-y-6">
            {countries.map((country) => (
              <div key={country.id} className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-text-primary">
                  {country.flag} {country.name}
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-text-muted">
                      <tr>
                        <th className="pb-2 pr-3">Plan</th>
                        <th className="pb-2 pr-3">Default (Nigeria)</th>
                        <th className="pb-2 pr-3">Override</th>
                        <th className="pb-2 pr-3">Set override</th>
                        <th className="pb-2">Clear</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PURCHASABLE_PLANS.map((plan) => {
                        const defaultKobo = PLAN_PRICING_KOBO[plan]?.monthly;
                        const override = overrideByCountryAndPlan.get(`${country.id}:${plan}`);
                        return (
                          <tr key={plan} className="border-t border-border">
                            <td className="py-2 pr-3 text-text-secondary">{PLAN_LABELS[plan]}</td>
                            <td className="py-2 pr-3 text-text-muted">
                              {defaultKobo ? `${formatMoney(defaultKobo, "NGN")} / month` : "—"}
                            </td>
                            <td className="py-2 pr-3">
                              {override ? (
                                <span className="text-text-primary">
                                  {formatMoney(override.priceMinor, override.currency)} / month
                                </span>
                              ) : (
                                <span className="text-text-muted">Using default</span>
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              <form action={upsertCountryPlanPrice} className="flex gap-1.5">
                                <input type="hidden" name="countryId" value={country.id} />
                                <input type="hidden" name="plan" value={plan} />
                                <input
                                  name="currency"
                                  placeholder={country.currency}
                                  defaultValue={override?.currency ?? country.currency}
                                  maxLength={3}
                                  className={`${inputClass} w-16`}
                                />
                                <input
                                  type="number"
                                  name="price"
                                  min={0}
                                  step="0.01"
                                  placeholder={
                                    override ? String(override.priceMinor / 100) : "amount"
                                  }
                                  className={`${inputClass} w-24`}
                                />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
                                >
                                  Save
                                </button>
                              </form>
                            </td>
                            <td className="py-2">
                              {override && (
                                <form action={clearCountryPlanPrice}>
                                  <input type="hidden" name="countryId" value={country.id} />
                                  <input type="hidden" name="plan" value={plan} />
                                  <button
                                    type="submit"
                                    className="rounded-lg border border-border-strong px-3 py-2 text-xs text-danger hover:border-danger"
                                  >
                                    Clear
                                  </button>
                                </form>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
