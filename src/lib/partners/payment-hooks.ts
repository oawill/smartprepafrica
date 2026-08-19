import { prisma } from "@/lib/prisma";
import { createCommission, countQualifiedPaidStudents } from "@/lib/partners/compensation";
import { notifyPartner } from "@/lib/partners/notify";

/** Called once, right after a Payment is verified SUCCESS and its
 * Subscription is created. This is the single hook point for every
 * automatic student/school commission — see activateSubscriptionForReference
 * in src/lib/paystack.ts. Never throws: a commission-side failure must
 * never block the subscription the student actually paid for. */
export async function handlePartnerCommissionsForPayment(params: {
  paymentId: string;
  subscriptionId: string;
  beneficiaryUserId: string;
  amountKobo: number;
}) {
  try {
    const beneficiary = await prisma.user.findUnique({
      where: { id: params.beneficiaryUserId },
      select: {
        id: true,
        referredByPartnerId: true,
        studentProfile: { select: { schoolId: true } },
      },
    });
    if (!beneficiary) return;

    // 1) Direct individual referral — only on the FIRST subscription ever
    // held by this user, matching "first qualifying subscription".
    if (beneficiary.referredByPartnerId) {
      const priorSubscriptions = await prisma.subscription.count({
        where: { userId: beneficiary.id, id: { not: params.subscriptionId } },
      });
      if (priorSubscriptions === 0) {
        const priorCount = await countQualifiedPaidStudents(beneficiary.referredByPartnerId);
        await createCommission({
          partnerId: beneficiary.referredByPartnerId,
          ruleKey: "student_first_subscription",
          eventType: "STUDENT_FIRST_SUBSCRIPTION",
          sourceUserId: beneficiary.id,
          sourcePaymentId: params.paymentId,
          sourceSubscriptionId: params.subscriptionId,
          baseAmountKobo: params.amountKobo,
          priorCount,
        });
      }
    }

    // 2) School-referral bonus — if this student belongs to a school that a
    // partner is attributed to, that partner earns a per-activated-student
    // commission too (independent of #1 — a different partner may get it).
    const schoolId = beneficiary.studentProfile?.schoolId;
    if (schoolId) {
      const attribution = await prisma.partnerSchoolAttribution.findUnique({
        where: { schoolId },
      });
      if (attribution) {
        const alreadyCredited = await prisma.partnerCommission.findFirst({
          where: {
            partnerId: attribution.partnerId,
            eventType: "SCHOOL_STUDENT_ACTIVATION",
            sourceUserId: beneficiary.id,
            status: { not: "REVERSED" },
          },
        });
        if (!alreadyCredited) {
          await createCommission({
            partnerId: attribution.partnerId,
            ruleKey: "school_student_activation",
            eventType: "SCHOOL_STUDENT_ACTIVATION",
            sourceUserId: beneficiary.id,
            sourceSchoolId: schoolId,
            sourcePaymentId: params.paymentId,
            sourceSubscriptionId: params.subscriptionId,
          });
        }

        // First-ever paid student at this attributed school also counts as
        // the school "becoming a paying school".
        const priorPaidAtSchool = await prisma.partnerCommission.count({
          where: {
            partnerId: attribution.partnerId,
            eventType: "SCHOOL_STUDENT_ACTIVATION",
            sourceSchoolId: schoolId,
            sourceUserId: { not: beneficiary.id },
            status: { not: "REVERSED" },
          },
        });
        if (priorPaidAtSchool === 0) {
          await markSchoolPaying(schoolId, attribution.partnerId, params.paymentId);
        }
      }
    }
  } catch (err) {
    console.error("Partner commission hook failed (payment still succeeded):", err);
  }
}

async function markSchoolPaying(schoolId: string, partnerId: string, paymentId: string) {
  const lead = await prisma.partnerSchoolLead.findFirst({
    where: { schoolId, partnerId, status: { notIn: ["PAYING_SCHOOL", "LOST"] } },
  });

  if (lead) {
    await prisma.partnerSchoolLead.update({
      where: { id: lead.id },
      data: { status: "PAYING_SCHOOL" },
    });
    await prisma.partnerSchoolLeadStatusChange.create({
      data: { leadId: lead.id, fromStatus: lead.status, toStatus: "PAYING_SCHOOL", note: "Auto-detected from first paid student." },
    });
    await notifyPartner(partnerId, "SCHOOL_ACTIVATED", `${lead.schoolName} just became a paying school!`);
  }

  const alreadyPaid = await prisma.partnerCommission.findFirst({
    where: { partnerId, eventType: "SCHOOL_ACTIVATION", sourceSchoolId: schoolId, status: { not: "REVERSED" } },
  });
  if (!alreadyPaid) {
    await createCommission({
      partnerId,
      ruleKey: "school_activation",
      eventType: "SCHOOL_ACTIVATION",
      sourceSchoolId: schoolId,
      sourcePaymentId: paymentId,
      sourceSchoolLeadId: lead?.id,
    });
  }
}

/** Manual admin/partner-side path for the same "school becomes paying"
 * event, for cases the payment webhook can't auto-detect (e.g. an
 * off-platform payment arrangement). Advances the lead and fires the same
 * commission rule as the automatic path. */
export async function manuallyMarkSchoolPaying(leadId: string, actorUserId: string | null) {
  const lead = await prisma.partnerSchoolLead.findUniqueOrThrow({ where: { id: leadId } });
  if (!lead.schoolId) {
    throw new Error("This lead isn't linked to a registered school yet.");
  }

  await prisma.partnerSchoolLead.update({
    where: { id: leadId },
    data: { status: "PAYING_SCHOOL" },
  });
  await prisma.partnerSchoolLeadStatusChange.create({
    data: {
      leadId,
      fromStatus: lead.status,
      toStatus: "PAYING_SCHOOL",
      changedById: actorUserId ?? undefined,
      note: "Marked paying manually.",
    },
  });

  const alreadyPaid = await prisma.partnerCommission.findFirst({
    where: { partnerId: lead.partnerId, eventType: "SCHOOL_ACTIVATION", sourceSchoolId: lead.schoolId, status: { not: "REVERSED" } },
  });
  if (!alreadyPaid) {
    await createCommission({
      partnerId: lead.partnerId,
      ruleKey: "school_activation",
      eventType: "SCHOOL_ACTIVATION",
      sourceSchoolId: lead.schoolId,
      sourceSchoolLeadId: lead.id,
    });
  }

  await notifyPartner(lead.partnerId, "SCHOOL_ACTIVATED", `${lead.schoolName} was confirmed as a paying school!`);
}
