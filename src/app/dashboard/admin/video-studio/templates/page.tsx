import Link from "next/link";
import { requireAdminPagePermission } from "@/lib/admin/authz";

export default async function VideoTemplatesPage() {
  await requireAdminPagePermission("video_studio.view");

  return (
    <div className="max-w-lg">
      <h1 className="text-h2 font-semibold text-text-primary">Templates</h1>
      <div className="mt-6 rounded-xl border border-dashed border-border-strong p-8 text-center">
        <p className="text-text-secondary">Reusable visual templates aren&apos;t available yet.</p>
        <p className="mt-1 text-sm text-text-muted">
          Definition Card, Equation Animation, Diagram Explanation, Question Card and the other visual templates
          arrive once the visual-generation phase is built.
        </p>
        <Link href="/dashboard/admin/video-studio" className="mt-4 inline-block text-sm text-brand-text hover:underline">
          ← Back to Video Learning Studio
        </Link>
      </div>
    </div>
  );
}
