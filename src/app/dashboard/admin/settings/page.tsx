import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card } from "@/components/dashboard/card";
import { getPlatformSettings } from "@/lib/legal/settings";
import { savePlatformSettings } from "@/app/dashboard/admin/settings/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500";
const labelClass = "block text-sm text-slate-300";

export default async function AdminPlatformSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const settings = await getPlatformSettings();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Platform settings</h1>
      <p className="mt-1 text-sm text-slate-400">
        Official company identity and support contact details shown on the Contact page and in
        the site footer. Leave a field blank to hide it rather than showing a placeholder.
      </p>

      <div className="mt-6">
        <Card title="Company & support info">
          <form action={savePlatformSettings} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="companyLegalName">
                Company legal name
              </label>
              <input
                id="companyLegalName"
                name="companyLegalName"
                defaultValue={settings.companyLegalName ?? ""}
                placeholder="Cicerah Technologies Limited"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Shown in the footer copyright line. Defaults to &quot;Cicerah Technologies Limited&quot; if left blank.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="supportEmail">
                  Support email
                </label>
                <input
                  id="supportEmail"
                  name="supportEmail"
                  type="email"
                  defaultValue={settings.supportEmail ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="supportPhone">
                  Support phone
                </label>
                <input
                  id="supportPhone"
                  name="supportPhone"
                  defaultValue={settings.supportPhone ?? ""}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="companyAddress">
                Business address
              </label>
              <input
                id="companyAddress"
                name="companyAddress"
                defaultValue={settings.companyAddress ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="supportHours">
                Support hours
              </label>
              <input
                id="supportHours"
                name="supportHours"
                defaultValue={settings.supportHours ?? ""}
                placeholder="Mon–Fri, 9am–5pm WAT"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Save settings
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
