import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { TOEFL_SKILLS, TOEFL_SKILL_LABELS } from "@/lib/toefl/types";

export default async function AdminToeflPage() {
  await requireAdminPagePermission("toefl.view");

  const counts = await Promise.all(
    TOEFL_SKILLS.map(async (skill) => ({
      skill,
      total: await prisma.toeflContent.count({ where: { skill } }),
      published: await prisma.toeflContent.count({ where: { skill, status: "PUBLISHED" } }),
    }))
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 font-semibold text-text-primary">International Exams — TOEFL</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Manage TOEFL Reading, Listening, Speaking, and Writing content.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {counts.map(({ skill, total, published }) => (
          <Card key={skill} title={TOEFL_SKILL_LABELS[skill]}>
            <p className="text-2xl font-semibold text-text-primary">{published}</p>
            <p className="text-xs text-text-muted">published of {total} total</p>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href="/dashboard/admin/toefl/content"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Manage Content →
        </Link>
      </div>
    </div>
  );
}
