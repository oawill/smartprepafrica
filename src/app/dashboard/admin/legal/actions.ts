"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { saveDocumentVersion } from "@/lib/legal/documents";

export async function saveLegalDocument(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }

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
