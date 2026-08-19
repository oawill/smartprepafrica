import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { QuestionForm } from "@/components/admin/question-form";
import { createQuestion } from "@/app/dashboard/admin/questions/actions";

export default async function NewQuestionPage() {
  await requireAdminPagePermission("questions.create");
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">New question</h1>
      <p className="mt-1 text-sm text-slate-400">
        Created as a draft. Submit it for review before it can be approved and published.
      </p>
      <div className="mt-6 max-w-3xl">
        <QuestionForm action={createQuestion} subjects={subjects} />
      </div>
    </div>
  );
}
