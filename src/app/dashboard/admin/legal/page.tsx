import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { getActiveDocument } from "@/lib/legal/documents";
import { saveLegalDocument } from "@/app/dashboard/admin/legal/actions";
import { Badge } from "@/components/ui/badge";

const documentTypes = [
  { type: "TERMS" as const, label: "Terms & Conditions" },
  { type: "PRIVACY" as const, label: "Privacy Policy" },
  { type: "PARTNER_PROGRAM" as const, label: "Partner Program Terms" },
];

export default async function AdminLegalDocumentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const activeDocs = await Promise.all(
    documentTypes.map(async ({ type }) => ({ type, doc: await getActiveDocument(type) }))
  );

  const allVersions = await prisma.legalDocument.findMany({
    orderBy: [{ type: "asc" }, { version: "desc" }],
  });

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Legal documents</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Editing a document never changes what a user already agreed to — saving creates a new
        version and the previous one is preserved for the audit trail.
      </p>

      <div className="mt-6 space-y-4">
        {activeDocs.map(({ type, doc }) => (
          <Card
            key={type}
            title={`${documentTypes.find((d) => d.type === type)?.label} (v${doc?.version ?? 1})`}
          >
            <form action={saveLegalDocument} className="space-y-3">
              <input type="hidden" name="type" value={type} />
              <input
                name="title"
                defaultValue={doc?.title ?? documentTypes.find((d) => d.type === type)?.label}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
              <textarea
                name="content"
                defaultValue={doc?.content ?? ""}
                rows={10}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-brand"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Save new version
              </button>
            </form>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card title="Version history">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr>
                <th className="pb-2">Type</th>
                <th className="pb-2">Version</th>
                <th className="pb-2">Active</th>
                <th className="pb-2">Effective</th>
              </tr>
            </thead>
            <tbody>
              {allVersions.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="py-2 text-text-primary">{v.type}</td>
                  <td className="py-2 text-text-primary">v{v.version}</td>
                  <td className="py-2">
                    {v.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Superseded</Badge>}
                  </td>
                  <td className="py-2 text-text-secondary">
                    {new Date(v.effectiveAt).toLocaleDateString("en-NG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
