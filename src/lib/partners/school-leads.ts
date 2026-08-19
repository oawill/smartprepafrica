import { randomUUID } from "node:crypto";
import type { Prisma, SchoolLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSchoolLeadNumber } from "@/lib/partners/ids";
import { logPartnerAudit } from "@/lib/partners/audit";

export async function createSchoolLead(
  partnerId: string,
  data: {
    schoolName: string;
    contactName: string;
    phone: string;
    email?: string;
    state?: string;
    city?: string;
    estimatedStudents?: number;
    estimatedTeachers?: number;
    notes?: string;
  }
) {
  const leadNumber = await generateSchoolLeadNumber();
  const lead = await prisma.partnerSchoolLead.create({
    data: { partnerId, leadNumber, ...data },
  });
  await prisma.partnerSchoolLeadStatusChange.create({
    data: { leadId: lead.id, toStatus: "NEW_LEAD" },
  });
  await logPartnerAudit({
    actorUserId: null,
    action: "SCHOOL_LEAD_CREATED",
    entityType: "PartnerSchoolLead",
    entityId: lead.id,
    metadata: { partnerId, leadNumber },
  });
  return lead;
}

// Stages a partner can move a lead through by hand. SCHOOL_REGISTERED is set
// only by registerSchoolFromInvitation; ACTIVATED/PAYING_SCHOOL only by the
// payment-detection hooks in payment-hooks.ts — never by direct user input.
const PARTNER_EDITABLE_STAGES: SchoolLeadStatus[] = [
  "CONTACTED",
  "DEMO_SCHEDULED",
  "NEGOTIATING",
  "LOST",
];

export async function updateLeadStage(
  leadId: string,
  partnerId: string,
  toStatus: SchoolLeadStatus,
  note: string | undefined,
  actorUserId: string
) {
  if (!PARTNER_EDITABLE_STAGES.includes(toStatus)) {
    throw new Error(`${toStatus} can't be set manually.`);
  }
  const lead = await prisma.partnerSchoolLead.findUniqueOrThrow({ where: { id: leadId } });
  if (lead.partnerId !== partnerId) {
    throw new Error("This lead doesn't belong to you.");
  }

  await prisma.partnerSchoolLead.update({ where: { id: leadId }, data: { status: toStatus } });
  await prisma.partnerSchoolLeadStatusChange.create({
    data: { leadId, fromStatus: lead.status, toStatus, changedById: actorUserId, note },
  });
}

export async function generateSchoolInvitation(leadId: string, partnerId: string) {
  const lead = await prisma.partnerSchoolLead.findUniqueOrThrow({ where: { id: leadId } });
  if (lead.partnerId !== partnerId) {
    throw new Error("This lead doesn't belong to you.");
  }

  const invitationToken = randomUUID();
  const invitationExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.partnerSchoolLead.update({
    where: { id: leadId },
    data: { invitationToken, invitationExpiresAt },
  });

  return { invitationToken, invitationExpiresAt };
}

/** Creates the PartnerSchoolAttribution for a newly registered school, or —
 * if the school already has one from a different partner — raises a
 * PartnerSchoolDispute instead of silently reassigning credit. Called inside
 * the same transaction that registers the school. */
export async function attributeSchoolToPartner(
  tx: Prisma.TransactionClient,
  schoolId: string,
  partnerId: string,
  winningLeadId: string
) {
  const existing = await tx.partnerSchoolAttribution.findUnique({ where: { schoolId } });

  if (!existing) {
    await tx.partnerSchoolAttribution.create({
      data: { schoolId, partnerId, winningLeadId },
    });
    return;
  }

  if (existing.partnerId === partnerId) return;

  await tx.partnerSchoolDispute.create({
    data: {
      schoolId,
      challengerLeadId: winningLeadId,
      incumbentPartnerId: existing.partnerId,
      challengerPartnerId: partnerId,
    },
  });
  await logPartnerAudit({
    actorUserId: null,
    action: "SCHOOL_ATTRIBUTION_DISPUTED",
    entityType: "School",
    entityId: schoolId,
    metadata: { incumbentPartnerId: existing.partnerId, challengerPartnerId: partnerId },
  });
}

/** Invitation-based school registration: the school admin who follows a
 * partner's invite link completes registration, and the originating partner
 * stays attached to the onboarding record regardless of what happens after. */
export async function registerSchoolFromInvitation(
  tx: Prisma.TransactionClient,
  invitationToken: string,
  schoolAdminUserId: string
) {
  const lead = await tx.partnerSchoolLead.findUnique({ where: { invitationToken } });
  if (!lead) throw new Error("This invitation link is invalid.");
  if (lead.invitationExpiresAt && lead.invitationExpiresAt < new Date()) {
    throw new Error("This invitation link has expired.");
  }

  const school = await tx.school.create({
    data: {
      name: lead.schoolName,
      state: lead.state ?? undefined,
      admins: { connect: { id: schoolAdminUserId } },
    },
  });

  await tx.partnerSchoolLead.update({
    where: { id: lead.id },
    data: { schoolId: school.id, status: "SCHOOL_REGISTERED" },
  });
  await tx.partnerSchoolLeadStatusChange.create({
    data: {
      leadId: lead.id,
      fromStatus: lead.status,
      toStatus: "SCHOOL_REGISTERED",
      note: "School completed registration via partner invitation link.",
    },
  });

  await attributeSchoolToPartner(tx, school.id, lead.partnerId, lead.id);

  return school;
}
