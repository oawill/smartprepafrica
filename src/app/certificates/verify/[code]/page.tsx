import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Short, human-typeable entry point to the same certificate page
 * (src/app/certificates/[certificateId]/page.tsx) — the cuid URL stays
 * the one canonical rendering path, so the certificate display itself
 * is written and maintained in exactly one place. */
export default async function VerifyCertificatePage({
  params,
}: PageProps<"/certificates/verify/[code]">) {
  const { code } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { verificationCode: code },
    select: { id: true },
  });

  if (!certificate) notFound();

  redirect(`/certificates/${certificate.id}`);
}
