"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

const overrideSchema = z.object({
  displayText: z.string().min(1),
  pronunciationText: z.string().min(1),
  phoneme: z.string().optional(),
});

export async function createPronunciationOverride(formData: FormData) {
  const session = await requireActionPermission("video_studio.create");
  const data = overrideSchema.parse({
    displayText: (formData.get("displayText") as string)?.trim(),
    pronunciationText: (formData.get("pronunciationText") as string)?.trim(),
    phoneme: (formData.get("phoneme") as string)?.trim() || undefined,
  });

  const override = await prisma.voicePronunciationOverride.create({ data });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VOICE_PRONUNCIATION_OVERRIDE_CREATED",
    resourceType: "VoicePronunciationOverride",
    resourceId: override.id,
    result: "SUCCESS",
    after: data,
  });

  revalidatePath("/dashboard/admin/video-studio/settings");
}

export async function deletePronunciationOverride(formData: FormData) {
  const session = await requireActionPermission("video_studio.create");
  const id = formData.get("id") as string;

  await prisma.voicePronunciationOverride.delete({ where: { id } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "VOICE_PRONUNCIATION_OVERRIDE_DELETED",
    resourceType: "VoicePronunciationOverride",
    resourceId: id,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/admin/video-studio/settings");
}
