import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";

export default async function AdminToeflPage() {
  await requireAdminPagePermission("toefl.view");

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 font-semibold text-text-primary">International Exams — TOEFL</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Manage TOEFL Reading, Listening, Speaking, and Writing content, diagnostic questions, and mock exams.
      </p>
      <div className="mt-6">
        <Card>
          <p className="text-sm text-text-secondary">
            Admin tools for TOEFL content management are coming in a later phase. This section currently only
            establishes navigation and permissions.
          </p>
        </Card>
      </div>
    </div>
  );
}
