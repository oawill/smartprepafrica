import Link from "next/link";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { ContentImportWizard } from "@/components/admin/content-import-wizard";

// sat.bulk_import is enough to reach this page — the wizard itself still
// gates each exam's upload/validate calls by the matching permission
// (sat.bulk_import or toefl.bulk_import), so an admin with only one of the
// two can still see the page but only successfully import that one exam.
export default async function NewContentImportPage() {
  await requireAdminPagePermission("sat.bulk_import");

  return (
    <div>
      <Link href="/dashboard/admin/content-import" className="text-sm text-text-secondary hover:text-text-primary">
        ← Question bank imports
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Bulk import questions</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Upload a CSV, XLSX, or JSON file of SAT or TOEFL questions. Imported content always starts as a draft —
        review and publish it from the batch detail screen once you&apos;re satisfied.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface-raised p-6">
        <ContentImportWizard />
      </div>
    </div>
  );
}
