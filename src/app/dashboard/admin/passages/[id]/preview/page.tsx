import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { asOptions } from "@/lib/practice-types";
import { PassagePreview } from "@/components/admin/passage-preview";

export default async function PassagePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPagePermission("questions.view");
  const { id } = await params;

  const passage = await prisma.passageGroup.findUnique({
    where: { id },
    include: { questions: { orderBy: { passageOrder: "asc" } } },
  });
  if (!passage) notFound();

  if (passage.questions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-sm text-slate-400">
        This passage has no attached questions yet — attach at least one to preview the student
        experience.
      </div>
    );
  }

  const questions = passage.questions.map((q) => ({
    responseId: q.id,
    questionId: q.id,
    prompt: q.prompt,
    options: asOptions(q.options),
    selectedOption: null,
    flagged: false,
    passageGroupId: q.passageGroupId,
    passageLineRef: q.passageLineRef,
    passageLineStart: q.passageLineStart,
    passageLineEnd: q.passageLineEnd,
  }));

  return (
    <PassagePreview
      passageGroupId={passage.id}
      passage={{
        id: passage.id,
        type: passage.type,
        title: passage.title,
        instructions: passage.instructions,
        bodyText: passage.bodyText,
        showLineNumbers: passage.showLineNumbers,
        startingLineNumber: passage.startingLineNumber,
      }}
      questions={questions}
    />
  );
}
