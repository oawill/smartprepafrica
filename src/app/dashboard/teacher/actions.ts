"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateTeacherProfile(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) throw new Error("You don't have a teacher profile.");

  const yearsExperienceRaw = formData.get("yearsExperience") as string;

  await prisma.teacherProfile.update({
    where: { id: teacher.id },
    data: {
      bio: (formData.get("bio") as string)?.trim() || null,
      photoUrl: (formData.get("photoUrl") as string)?.trim() || null,
      qualifications: (formData.get("qualifications") as string)?.trim() || null,
      yearsExperience: yearsExperienceRaw ? Number(yearsExperienceRaw) : null,
    },
  });

  revalidatePath("/dashboard/teacher");
}
