import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { CreateVideoWizard, type CurriculumCountry } from "@/app/dashboard/admin/video-studio/new/create-video-wizard";

export default async function NewVideoProjectPage() {
  await requireAdminPagePermission("video_studio.create");

  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" },
    select: {
      code: true,
      name: true,
      flag: true,
      countryExams: {
        select: {
          id: true,
          status: true,
          exam: { select: { name: true, code: true, examBody: { select: { name: true } } } },
          subjects: {
            select: {
              subject: { select: { id: true, name: true } },
              topics: { select: { id: true, name: true }, orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });

  const curriculum: CurriculumCountry[] = countries.map((c) => ({
    code: c.code,
    name: c.name,
    flag: c.flag,
    exams: c.countryExams.map((ce) => ({
      countryExamId: ce.id,
      status: ce.status,
      examName: ce.exam.name,
      examBodyName: ce.exam.examBody.name,
      subjects: ce.subjects.map((s) => ({
        subjectId: s.subject.id,
        subjectName: s.subject.name,
        topics: s.topics.map((t) => ({ id: t.id, name: t.name })),
      })),
    })),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-h2 font-semibold text-text-primary">Create Video</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Build a curriculum-aligned video project. You can generate an AI script once the project is created.
      </p>
      <CreateVideoWizard curriculum={curriculum} />
    </div>
  );
}
