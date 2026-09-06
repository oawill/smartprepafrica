import { requireAdminPagePermission } from "@/lib/admin/authz";
import { ToeflContentForm } from "@/components/admin/toefl-content-form";
import { createToeflContent } from "@/app/dashboard/admin/toefl/content/actions";

export default async function NewToeflContentPage() {
  await requireAdminPagePermission("toefl.create");

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">New TOEFL content</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Created as a draft. Submit it for review before it can be approved and published.
      </p>
      <div className="mt-6 max-w-3xl">
        <ToeflContentForm action={createToeflContent} />
      </div>
    </div>
  );
}
