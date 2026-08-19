import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { updatePartnerProfile } from "@/app/dashboard/partner/profile/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500";
const labelClass = "block text-sm text-slate-300";

export default async function PartnerProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PARTNER") redirect("/dashboard");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Profile</h1>

      <div className="mt-6">
        <Card title="Contact & payout details">
          <form action={updatePartnerProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  defaultValue={partner.phone}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="organization">
                  Organization
                </label>
                <input
                  id="organization"
                  name="organization"
                  defaultValue={partner.organization ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="state">
                  State
                </label>
                <input id="state" name="state" defaultValue={partner.state ?? ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="city">
                  City
                </label>
                <input id="city" name="city" defaultValue={partner.city ?? ""} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="preferredPaymentMethod">
                Preferred payment method
              </label>
              <select
                id="preferredPaymentMethod"
                name="preferredPaymentMethod"
                defaultValue={partner.preferredPaymentMethod ?? ""}
                className={inputClass}
              >
                <option value="">Not sure yet</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="PAYSTACK">Paystack</option>
                <option value="MANUAL">Other / manual arrangement</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass} htmlFor="bankName">
                  Bank name
                </label>
                <input
                  id="bankName"
                  name="bankName"
                  defaultValue={partner.bankName ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="bankAccountName">
                  Account name
                </label>
                <input
                  id="bankAccountName"
                  name="bankAccountName"
                  defaultValue={partner.bankAccountName ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="bankAccountNumber">
                  Account number
                </label>
                <input
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  defaultValue={partner.bankAccountNumber ?? ""}
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="hideFromLeaderboard"
                defaultChecked={partner.hideFromLeaderboard}
              />
              Hide me from the public partner leaderboard
            </label>

            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Save changes
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
