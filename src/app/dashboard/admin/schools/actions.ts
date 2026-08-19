"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

async function setSchoolStatus(
  schoolId: string,
  status: "PENDING" | "VERIFICATION_REQUIRED" | "ACTIVE" | "SUSPENDED" | "CLOSED",
  reason: string | null,
  actorId: string,
  actorRole: import("@prisma/client").Role,
  action: string
) {
  await prisma.school.update({
    where: { id: schoolId },
    data: {
      status,
      verified: status === "ACTIVE",
      statusReason: reason,
      statusChangedById: actorId,
      statusChangedAt: new Date(),
    },
  });
  await logAudit({
    actorUserId: actorId,
    actorRole,
    action,
    resourceType: "School",
    resourceId: schoolId,
    result: "SUCCESS",
    after: { status, reason },
  });
  revalidatePath("/dashboard/admin/schools");
}

export async function verifyAndActivateSchool(formData: FormData) {
  const session = await requireActionPermission("schools.approve");
  await setSchoolStatus(
    formData.get("schoolId") as string,
    "ACTIVE",
    null,
    session.user.id,
    session.user.role,
    "SCHOOL_VERIFIED_ACTIVATED"
  );
}

export async function requestMoreVerification(formData: FormData) {
  const session = await requireActionPermission("schools.approve");
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!reason) throw new Error("A reason is required.");
  await setSchoolStatus(
    formData.get("schoolId") as string,
    "VERIFICATION_REQUIRED",
    reason,
    session.user.id,
    session.user.role,
    "SCHOOL_VERIFICATION_REQUESTED"
  );
}

export async function suspendSchool(formData: FormData) {
  const session = await requireActionPermission("schools.approve");
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!reason) throw new Error("A reason is required to suspend a school.");
  await setSchoolStatus(
    formData.get("schoolId") as string,
    "SUSPENDED",
    reason,
    session.user.id,
    session.user.role,
    "SCHOOL_SUSPENDED"
  );
}

export async function closeSchool(formData: FormData) {
  const session = await requireActionPermission("schools.approve");
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!reason) throw new Error("A reason is required to close a school.");
  await setSchoolStatus(
    formData.get("schoolId") as string,
    "CLOSED",
    reason,
    session.user.id,
    session.user.role,
    "SCHOOL_CLOSED"
  );
}
