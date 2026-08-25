import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { PassageForm } from "@/components/admin/passage-form";
import { createPassage } from "@/app/dashboard/admin/passages/actions";

export default async function NewPassagePage() {
  await requireAdminPagePermission("questions.create");
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">New passage</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Created as a draft. Submit it for review before it can be approved and published — then attach
        questions to it from the passage&apos;s detail page.
      </p>
      <div className="mt-6 max-w-4xl">
        <PassageForm action={createPassage} subjects={subjects} />
      </div>
    </div>
  );
}
