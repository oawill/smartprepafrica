import { requireAdminPagePermission } from "@/lib/admin/authz";
import { SatContentForm } from "@/components/admin/sat-content-form";
import { createSatContent } from "@/app/dashboard/admin/sat/content/actions";

export default async function NewSatContentPage() {
  await requireAdminPagePermission("sat.create");

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">New SAT content</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Created as a draft. Submit it for review before it can be approved and published.
      </p>
      <div className="mt-6 max-w-3xl">
        <SatContentForm action={createSatContent} />
      </div>
    </div>
  );
}
