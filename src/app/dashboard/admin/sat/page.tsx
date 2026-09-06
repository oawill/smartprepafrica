import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { SAT_SECTIONS, SAT_SECTION_LABELS } from "@/lib/sat/types";

export default async function AdminSatPage() {
  await requireAdminPagePermission("sat.view");

  const counts = await Promise.all(
    SAT_SECTIONS.map(async (section) => ({
      section,
      total: await prisma.satContent.count({ where: { section } }),
      published: await prisma.satContent.count({ where: { section, status: "PUBLISHED" } }),
    }))
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 font-semibold text-text-primary">International Exams — SAT</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Manage Digital SAT Reading and Writing, and Math content.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {counts.map(({ section, total, published }) => (
          <Card key={section} title={SAT_SECTION_LABELS[section]}>
            <p className="text-2xl font-semibold text-text-primary">{published}</p>
            <p className="text-xs text-text-muted">published of {total} total</p>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href="/dashboard/admin/sat/content"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Manage Content →
        </Link>
      </div>
    </div>
  );
}
