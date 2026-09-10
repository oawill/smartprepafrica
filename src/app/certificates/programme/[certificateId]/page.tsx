import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ProgrammeCertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;

  const certificate = await prisma.programmeCertificate.findUnique({
    where: { id: certificateId },
    include: {
      user: { select: { name: true } },
      programme: {
        select: {
          title: true,
          courses: {
            orderBy: { order: "asc" },
            select: { course: { select: { title: true } } },
          },
        },
      },
    },
  });

  if (!certificate) notFound();

  // ProgrammeCertificate rows are always created with a verificationCode
  // already set (see checkProgrammeCompletions in src/app/learn/actions.ts)
  // — unlike Certificate, there are no pre-existing rows to backfill, so
  // no lazy-generation helper is needed here.
  const verificationCode = certificate.verificationCode!;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back home
      </Link>

      <div className="mt-6 rounded-2xl border-2 border-orange-500/40 bg-slate-900 p-10 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-400">
          SmartPrepAfrica.com
        </p>
        <p className="mt-6 text-sm text-slate-400">This certifies that</p>
        <p className="mt-2 text-3xl font-semibold">{certificate.user.name}</p>
        <p className="mt-4 text-sm text-slate-400">has successfully completed the</p>
        <p className="mt-2 text-xl font-medium text-orange-300">{certificate.programme.title} Programme</p>

        <div className="mt-8 text-left">
          <p className="text-xs uppercase tracking-wide text-slate-500">Courses completed</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {certificate.programme.courses.map((pc, i) => (
              <li key={i}>· {pc.course.title}</li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-slate-400">
          <div>
            <p className="text-xs text-slate-500">Issued</p>
            <p className="mt-1 text-slate-200">{certificate.issuedAt.toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-green-800 bg-green-900/30 px-4 py-2 text-sm text-green-300">
          ✓ Verified certificate
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Certificate ID: {certificate.id}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Verification code: <span className="text-slate-300">{verificationCode}</span> — check
          at smartprepafrica.com/certificates/programme/verify/{verificationCode}
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-text-muted">
        Anyone with this link can verify this certificate&apos;s authenticity.
      </p>
    </div>
  );
}
