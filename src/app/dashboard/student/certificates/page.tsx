import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudentCertificatesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const certificates = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div>
      <Link href="/dashboard/student" className="text-sm text-slate-400 hover:text-white">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">My certificates</h1>

      {certificates.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
          Complete a course to earn your first certificate.
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          {certificates.map((cert) => (
            <Link
              key={cert.id}
              href={`/certificates/${cert.id}`}
              target="_blank"
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm hover:border-slate-600"
            >
              <span className="text-slate-100">{cert.course.title}</span>
              <span className="text-xs text-slate-500">
                {cert.issuedAt.toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
