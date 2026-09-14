"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

const outreachTypes = ["EMAIL", "PHONE", "MEETING", "INTRODUCTION", "CONFERENCE", "LINKEDIN", "REFERRAL", "OTHER"] as const;

export async function recordOutreach(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const funderId = formData.get("funderId") as string;
  const type = formData.get("type") as (typeof outreachTypes)[number];
  if (!funderId || !type) return;

  const contactId = (formData.get("contactId") as string) || undefined;
  const opportunityId = (formData.get("opportunityId") as string) || undefined;
  const dateRaw = formData.get("date") as string;
  const followUpRaw = formData.get("followUpDate") as string;

  const outreach = await prisma.educationAccessOutreach.create({
    data: {
      funderId,
      contactId,
      opportunityId,
      type,
      date: dateRaw ? new Date(dateRaw) : new Date(),
      ownerId: session.user.id,
      subject: (formData.get("subject") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      response: (formData.get("response") as string) || undefined,
      followUpDate: followUpRaw ? new Date(followUpRaw) : undefined,
    },
  });

  // Keep the contact's own last-contacted/next-follow-up fields current,
  // since those drive the funder detail page's relationship view.
  if (contactId) {
    await prisma.educationAccessFunderContact.update({
      where: { id: contactId },
      data: {
        lastContactedAt: outreach.date,
        nextFollowUp: outreach.followUpDate,
      },
    });
  }

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "OUTREACH_RECORDED",
    resourceType: "EducationAccessOutreach",
    resourceId: outreach.id,
    result: "SUCCESS",
    after: { funderId, type },
  });

  if (opportunityId) {
    revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${opportunityId}`);
  }
  revalidatePath(`/dashboard/admin/education-access/funding-center/funders/${funderId}`);
  revalidatePath("/dashboard/admin/education-access/funding-center/outreach");
}
