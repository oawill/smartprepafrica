import type { LegalDocumentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Reads the current active version of a legal document type. Never
 * mutated in place — see LegalDocument's versioning comment. */
export async function getActiveDocument(type: LegalDocumentType) {
  return prisma.legalDocument.findFirst({
    where: { type, isActive: true },
    orderBy: { version: "desc" },
  });
}

/** Creates version+1 of a document and deactivates the previous version.
 * Past LegalAcceptance rows keep pointing at the exact version they
 * recorded, so this never rewrites what a user already agreed to. */
export async function saveDocumentVersion(
  type: LegalDocumentType,
  data: { title: string; content: string; createdById?: string }
) {
  const existing = await getActiveDocument(type);
  const nextVersion = (existing?.version ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.legalDocument.update({ where: { id: existing.id }, data: { isActive: false } });
    }
    return tx.legalDocument.create({
      data: {
        type,
        version: nextVersion,
        isActive: true,
        title: data.title,
        content: data.content,
        createdById: data.createdById,
      },
    });
  });
}

/** Records that a user accepted the current active version of a document,
 * inside the same transaction that creates their account. */
export async function recordAcceptance(
  tx: Prisma.TransactionClient,
  params: { type: LegalDocumentType; userId?: string | null; context: string; ipHash?: string | null }
) {
  const doc = await tx.legalDocument.findFirst({
    where: { type: params.type, isActive: true },
    orderBy: { version: "desc" },
  });
  if (!doc) return null;

  return tx.legalAcceptance.create({
    data: {
      documentId: doc.id,
      userId: params.userId ?? undefined,
      context: params.context,
      ipHash: params.ipHash ?? undefined,
    },
  });
}
