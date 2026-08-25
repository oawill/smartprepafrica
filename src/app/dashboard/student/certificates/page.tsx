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
      <Link href="/dashboard/student" className="text-sm text-text-secondary hover:text-text-primary">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-h2 font-semibold text-text-primary">My certificates</h1>

      {certificates.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
          Complete a course to earn your first certificate.
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          {certificates.map((cert) => (
            <Link
              key={cert.id}
              href={`/certificates/${cert.id}`}
              target="_blank"
              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm hover:border-border-strong"
            >
              <span className="text-text-primary">{cert.course.title}</span>
              <span className="text-xs text-text-muted">
                {cert.issuedAt.toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
