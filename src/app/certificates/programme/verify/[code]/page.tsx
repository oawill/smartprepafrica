import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Short, human-typeable entry point to the same certificate page
 * (src/app/certificates/programme/[certificateId]/page.tsx) — same
 * split as the course certificate's verify route: the cuid URL stays
 * the one canonical rendering path. */
export default async function VerifyProgrammeCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const certificate = await prisma.programmeCertificate.findUnique({
    where: { verificationCode: code },
    select: { id: true },
  });

  if (!certificate) notFound();

  redirect(`/certificates/programme/${certificate.id}`);
}
