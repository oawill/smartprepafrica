import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function CertificatePage({
  params,
}: PageProps<"/certificates/[certificateId]">) {
  const { certificateId } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      user: { select: { name: true } },
      course: {
        select: {
          title: true,
          instructorName: true,
          school: { select: { name: true } },
        },
      },
    },
  });

  if (!certificate) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">
        ← Back home
      </Link>

      <div className="mt-6 rounded-2xl border-2 border-orange-500/40 bg-slate-900 p-10 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-400">
          SmartPrepAfrica.com
        </p>
        <p className="mt-6 text-sm text-slate-400">This certifies that</p>
        <p className="mt-2 text-3xl font-semibold">{certificate.user.name}</p>
        <p className="mt-4 text-sm text-slate-400">has successfully completed</p>
        <p className="mt-2 text-xl font-medium text-orange-300">{certificate.course.title}</p>

        <div className="mt-8 flex justify-center gap-8 text-sm text-slate-400">
          <div>
            <p className="text-xs text-slate-500">Instructor</p>
            <p className="mt-1 text-slate-200">{certificate.course.instructorName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Issued</p>
            <p className="mt-1 text-slate-200">{certificate.issuedAt.toLocaleDateString()}</p>
          </div>
          {certificate.course.school && (
            <div>
              <p className="text-xs text-slate-500">School</p>
              <p className="mt-1 text-slate-200">{certificate.course.school.name}</p>
            </div>
          )}
        </div>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-green-800 bg-green-900/30 px-4 py-2 text-sm text-green-300">
          ✓ Verified certificate
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Certificate ID: {certificate.id}
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Anyone with this link can verify this certificate&apos;s authenticity.
      </p>
    </div>
  );
}
