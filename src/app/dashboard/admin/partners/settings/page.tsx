import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card } from "@/components/dashboard/card";
import { getPartnerSettings } from "@/lib/partners/settings";
import { saveProgramSettings } from "@/app/dashboard/admin/partners/settings/actions";

export default async function AdminPartnerSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const settings = await getPartnerSettings();

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Partner program settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Platform-wide configuration for the partner program — no deployment required to change
        these.
      </p>

      <div className="mt-6">
        <Card title="Configuration">
          <form action={saveProgramSettings} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary" htmlFor="attributionWindowDays">
                Attribution window (days)
              </label>
              <input
                id="attributionWindowDays"
                name="attributionWindowDays"
                type="number"
                defaultValue={settings.attributionWindowDays}
                className="mt-1 w-full max-w-xs rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
              <p className="mt-1 text-xs text-text-muted">
                How long a click stays valid for attributing a later registration.
              </p>
            </div>

            <div>
              <label className="block text-sm text-text-secondary" htmlFor="minimumPayoutNaira">
                Minimum payout (₦)
              </label>
              <input
                id="minimumPayoutNaira"
                name="minimumPayoutNaira"
                type="number"
                defaultValue={settings.minimumPayoutKobo / 100}
                className="mt-1 w-full max-w-xs rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                name="requireAdminApproval"
                defaultChecked={settings.requireAdminApproval}
              />
              Require admin approval for new partner applications
            </label>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                name="leaderboardEnabled"
                defaultChecked={settings.leaderboardEnabled}
              />
              Enable the partner leaderboard platform-wide
            </label>

            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Save settings
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
