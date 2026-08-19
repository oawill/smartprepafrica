import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { generateQuestionCsvTemplate } from "@/lib/admin/question-csv";
import { BulkUploadWizard } from "@/components/admin/bulk-upload-wizard";

export default async function BulkUploadPage() {
  await requireAdminPagePermission("questions.bulk_upload");
  const templateCsv = generateQuestionCsvTemplate();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bulk upload questions</h1>
      <p className="mt-1 text-sm text-slate-400">
        CSV only. Every row is validated before anything is imported — nothing is written to the
        question bank until you confirm. Imported rows always start as drafts and still need
        review and publishing.
      </p>
      <div className="mt-6">
        <Card title="Upload wizard">
          <BulkUploadWizard templateCsv={templateCsv} />
        </Card>
      </div>
    </div>
  );
}
