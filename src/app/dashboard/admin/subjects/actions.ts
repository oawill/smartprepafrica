"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

export async function createSubject(formData: FormData) {
  const session = await requireActionPermission("subjects.manage");
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Subject name is required.");

  const subject = await prisma.subject.create({ data: { name } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SUBJECT_CREATED",
    resourceType: "Subject",
    resourceId: subject.id,
    result: "SUCCESS",
    after: { name },
  });
  revalidatePath("/dashboard/admin/subjects");
}

export async function renameSubject(formData: FormData) {
  const session = await requireActionPermission("subjects.manage");
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Subject name is required.");

  const before = await prisma.subject.findUniqueOrThrow({ where: { id } });
  await prisma.subject.update({ where: { id }, data: { name } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SUBJECT_RENAMED",
    resourceType: "Subject",
    resourceId: id,
    result: "SUCCESS",
    before: { name: before.name },
    after: { name },
  });
  revalidatePath("/dashboard/admin/subjects");
}

const academicTracks = ["SCIENCE", "ARTS", "COMMERCIAL"] as const;

/** Drives /onboarding's subject suggestions per academic track. Leaving
 * all three unchecked means General/All — suggested regardless of track,
 * never hidden from anyone either way (this only ever affects which
 * boxes are pre-ticked during onboarding). */
export async function updateSubjectTracks(formData: FormData) {
  const session = await requireActionPermission("subjects.manage");
  const id = formData.get("id") as string;
  const tracks = formData.getAll("academicTracks").map(String).filter((t) => academicTracks.includes(t as never));

  const before = await prisma.subject.findUniqueOrThrow({ where: { id }, select: { academicTracks: true } });
  await prisma.subject.update({ where: { id }, data: { academicTracks: tracks as never } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SUBJECT_TRACKS_UPDATED",
    resourceType: "Subject",
    resourceId: id,
    result: "SUCCESS",
    before: { academicTracks: before.academicTracks },
    after: { academicTracks: tracks },
  });
  revalidatePath("/dashboard/admin/subjects");
}

/** Renames every question's `topic` string within a subject from `from` to
 * `to` — the closest safe equivalent to "merge" since topics are free-text
 * rather than a foreign-keyed table (no schema migration risk to existing
 * seeded questions). */
export async function renameOrMergeTopic(formData: FormData) {
  const session = await requireActionPermission("subjects.manage");
  const subjectId = formData.get("subjectId") as string;
  const from = (formData.get("from") as string)?.trim();
  const to = (formData.get("to") as string)?.trim();
  if (!from || !to) throw new Error("Both the current and new topic name are required.");

  const result = await prisma.question.updateMany({
    where: { subjectId, topic: from },
    data: { topic: to },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOPIC_RENAMED_OR_MERGED",
    resourceType: "Subject",
    resourceId: subjectId,
    result: "SUCCESS",
    before: { from },
    after: { to, questionsAffected: result.count },
  });
  revalidatePath("/dashboard/admin/subjects");
}
