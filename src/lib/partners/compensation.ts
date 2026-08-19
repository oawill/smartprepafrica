import type { CommissionEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateCommissionNumber } from "@/lib/partners/ids";
import { notifyPartner } from "@/lib/partners/notify";

type TierBracket = { minCount: number; maxCount: number | null; amountKobo: number };

/** Reads the current active version of a named compensation rule. Never
 * mutated in place — see PartnerCommissionRule's versioning comment. */
export async function getActiveRule(ruleKey: string) {
  return prisma.partnerCommissionRule.findFirst({
    where: { ruleKey, isActive: true },
    orderBy: { version: "desc" },
  });
}

function computeFromBrackets(brackets: TierBracket[], countBeforeThisOne: number): number {
  const bracket = brackets.find(
    (b) => countBeforeThisOne >= b.minCount && (b.maxCount === null || countBeforeThisOne < b.maxCount)
  );
  return bracket?.amountKobo ?? 0;
}

/** Computes the kobo amount for one commission event under a rule.
 * `baseAmountKobo` is the payment amount the percentage applies to (only
 * relevant for PERCENTAGE rules); `priorCount` is how many qualifying
 * events this partner already has for this rule, used for tiered brackets. */
function computeAmountKobo(
  rule: { calcType: string; fixedAmountKobo: number | null; percentage: number | null; tierBrackets: Prisma.JsonValue | null; maxAmountKobo: number | null },
  opts: { baseAmountKobo?: number; priorCount?: number }
): number {
  let amount = 0;

  if (rule.tierBrackets) {
    const brackets = rule.tierBrackets as unknown as TierBracket[];
    amount = computeFromBrackets(brackets, opts.priorCount ?? 0);
  } else if (rule.calcType === "PERCENTAGE") {
    amount = Math.round(((opts.baseAmountKobo ?? 0) * (rule.percentage ?? 0)) / 100);
  } else {
    amount = rule.fixedAmountKobo ?? 0;
  }

  if (rule.maxAmountKobo !== null && rule.maxAmountKobo !== undefined) {
    amount = Math.min(amount, rule.maxAmountKobo);
  }
  return amount;
}

export type CreateCommissionInput = {
  partnerId: string;
  ruleKey: string;
  eventType: CommissionEventType;
  sourceUserId?: string;
  sourceSchoolId?: string;
  sourcePaymentId?: string;
  sourceSubscriptionId?: string;
  sourceSchoolLeadId?: string;
  baseAmountKobo?: number; // payment amount, for PERCENTAGE rules
  priorCount?: number; // for tiered brackets
};

/** Creates one PENDING commission from the current active rule for
 * `ruleKey`. Returns null (and creates nothing) if no active rule exists —
 * an admin simply hasn't configured that compensation type yet. */
export async function createCommission(input: CreateCommissionInput) {
  const rule = await getActiveRule(input.ruleKey);
  if (!rule) return null;

  const amountKobo = computeAmountKobo(rule, {
    baseAmountKobo: input.baseAmountKobo,
    priorCount: input.priorCount,
  });
  if (amountKobo <= 0) return null;

  const qualifiesAt = new Date();
  qualifiesAt.setDate(qualifiesAt.getDate() + rule.qualificationHoldDays);

  const commissionNumber = await generateCommissionNumber();

  const commission = await prisma.partnerCommission.create({
    data: {
      commissionNumber,
      partnerId: input.partnerId,
      ruleId: rule.id,
      eventType: input.eventType,
      sourceUserId: input.sourceUserId,
      sourceSchoolId: input.sourceSchoolId,
      sourcePaymentId: input.sourcePaymentId,
      sourceSubscriptionId: input.sourceSubscriptionId,
      sourceSchoolLeadId: input.sourceSchoolLeadId,
      amountKobo,
      status: "PENDING",
      qualifiesAt,
    },
  });

  await notifyPartner(
    input.partnerId,
    "COMMISSION_EARNED",
    `You earned a commission of ${formatNaira(amountKobo)} (${commissionNumber}). It will qualify for payout after the review period.`
  );

  return commission;
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

/** How many of a partner's referred students already have a qualifying
 * (qualified-or-later) STUDENT_FIRST_SUBSCRIPTION commission — the basis
 * for both tiered-bracket pricing and partner tier computation. */
export async function countQualifiedPaidStudents(partnerId: string): Promise<number> {
  return prisma.partnerCommission.count({
    where: {
      partnerId,
      eventType: "STUDENT_FIRST_SUBSCRIPTION",
      status: { in: ["QUALIFIED", "APPROVED", "AVAILABLE", "PAID"] },
    },
  });
}

export type ComputedTier = { name: string; perks: string | null; bonusPercentage: number } | null;

export async function computeTierForPartner(partnerId: string): Promise<ComputedTier> {
  const paidStudents = await countQualifiedPaidStudents(partnerId);
  const tiers = await prisma.partnerTier.findMany({ orderBy: { minPaidStudents: "desc" } });
  const match = tiers.find((t) => paidStudents >= t.minPaidStudents);
  if (!match) return null;
  return { name: match.name, perks: match.perks, bonusPercentage: match.bonusPercentage };
}

/** Reverses commissions tied to a payment that was refunded/charged back —
 * unless already paid out, in which case it's flagged for manual clawback
 * rather than silently reversed. */
export async function reverseCommissionsForPayment(paymentId: string, reason: string) {
  const commissions = await prisma.partnerCommission.findMany({
    where: { sourcePaymentId: paymentId, status: { notIn: ["REVERSED", "CANCELLED"] } },
  });

  for (const c of commissions) {
    if (c.status === "PAID") {
      await prisma.partnerFraudFlag.create({
        data: {
          partnerId: c.partnerId,
          reason: "REFUND_AFTER_PAYOUT",
          details: `Commission ${c.commissionNumber} was already paid out but its source payment was refunded/charged back (${reason}). Needs manual clawback.`,
          relatedCommissionId: c.id,
        },
      });
      continue;
    }
    await prisma.partnerCommission.update({
      where: { id: c.id },
      data: { status: "REVERSED", reversedAt: new Date(), reversalReason: reason },
    });
  }

  return commissions.length;
}

/** Opportunistic qualification sweep — no cron infra in this app, so this
 * runs on partner/admin dashboard loads (cheap, indexed on qualifiesAt) and
 * can also be triggered manually by an admin. Commissions for a partner
 * with an OPEN fraud flag stop at QUALIFIED and wait for manual admin
 * approval instead of auto-progressing to AVAILABLE. */
export async function runQualificationSweep(partnerId?: string) {
  const now = new Date();
  const due = await prisma.partnerCommission.findMany({
    where: {
      status: "PENDING",
      qualifiesAt: { lte: now },
      ...(partnerId ? { partnerId } : {}),
    },
  });

  let qualified = 0;
  let autoApproved = 0;

  for (const c of due) {
    const hasOpenFraud = await prisma.partnerFraudFlag.count({
      where: { partnerId: c.partnerId, status: { in: ["OPEN", "REVIEWING"] } },
    });

    if (hasOpenFraud > 0) {
      await prisma.partnerCommission.update({
        where: { id: c.id },
        data: { status: "QUALIFIED", qualifiedAt: now },
      });
      qualified++;
      continue;
    }

    await prisma.partnerCommission.update({
      where: { id: c.id },
      data: {
        status: "AVAILABLE",
        qualifiedAt: now,
        approvedAt: now,
        availableAt: now,
      },
    });
    qualified++;
    autoApproved++;

    await notifyPartner(
      c.partnerId,
      "COMMISSION_AVAILABLE",
      `Commission ${c.commissionNumber} (${formatNaira(c.amountKobo)}) is now available for payout.`
    );
  }

  return { qualified, autoApproved };
}
