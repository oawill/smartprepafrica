"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/admin/authz";
import { saveDocumentVersion } from "@/lib/legal/documents";

export async function saveLegalDocument(formData: FormData) {
  const session = await requireActionPermission("legal.update");

  const type = formData.get("type") as "TERMS" | "PRIVACY" | "PARTNER_PROGRAM";
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!title || !content) throw new Error("Title and content are required.");

  await saveDocumentVersion(type, { title, content, createdById: session.user.id });

  revalidatePath("/dashboard/admin/legal");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/partners/terms");
}
