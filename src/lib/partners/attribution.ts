import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPartnerSettings } from "@/lib/partners/settings";

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function resolveApprovedPartnerByCode(code: string) {
  if (!code) return null;
  return prisma.partner.findFirst({
    where: { referralCode: code, status: "APPROVED" },
  });
}

async function getOrCreateCampaign(partnerId: string, slug: string | null) {
  if (!slug) return null;
  return prisma.partnerCampaign.upsert({
    where: { partnerId_slug: { partnerId, slug } },
    update: {},
    create: { partnerId, slug, name: slug },
  });
}

/** Called when a referral link (/join or a direct ?ref= registration link)
 * is visited. Creates the click record and returns the token to carry
 * forward — via cookie AND as a URL/hidden-field fallback, since attribution
 * must not depend solely on cookies. */
export async function recordReferralClick(params: {
  code: string;
  campaignSlug?: string | null;
  landingPage: string;
  intent?: "STUDENT" | "SCHOOL" | null;
  ipHash: string | null;
  userAgent: string | null;
}) {
  const partner = await resolveApprovedPartnerByCode(params.code);
  if (!partner) return null;

  const campaign = await getOrCreateCampaign(partner.id, params.campaignSlug ?? null);

  const referral = await prisma.partnerReferral.create({
    data: {
      partnerId: partner.id,
      campaignId: campaign?.id,
      clickToken: randomUUID(),
      landingPage: params.landingPage,
      intent: params.intent ?? undefined,
      ipHash: params.ipHash ?? undefined,
      userAgent: params.userAgent ?? undefined,
    },
  });

  return { partner, campaign, referral };
}

type AttributionInput = {
  code?: string | null;
  campaignSlug?: string | null;
  clickToken?: string | null;
  landingPage?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
};

/** Attaches partner attribution to a brand-new user, inside the same
 * transaction that creates the User row. This is the ONLY writer of
 * User.referredByPartnerId — there is no update path, so a referral can
 * never be attached or changed after the account exists. */
export async function captureAttributionAtRegistration(
  tx: Prisma.TransactionClient,
  userId: string,
  input: AttributionInput
) {
  const code = input.code?.trim();
  if (!code) return;

  const partner = await tx.partner.findFirst({
    where: { referralCode: code, status: "APPROVED" },
  });
  if (!partner) return;

  const settings = await getPartnerSettings();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - settings.attributionWindowDays);

  let campaignId: string | null = null;
  if (input.campaignSlug) {
    const campaign = await tx.partnerCampaign.upsert({
      where: { partnerId_slug: { partnerId: partner.id, slug: input.campaignSlug } },
      update: {},
      create: { partnerId: partner.id, slug: input.campaignSlug, name: input.campaignSlug },
    });
    campaignId = campaign.id;
  }

  let referralRow = null;
  if (input.clickToken) {
    const existing = await tx.partnerReferral.findUnique({ where: { clickToken: input.clickToken } });
    if (
      existing &&
      existing.partnerId === partner.id &&
      existing.status === "CLICKED" &&
      existing.clickedAt >= windowStart
    ) {
      referralRow = await tx.partnerReferral.update({
        where: { id: existing.id },
        data: { userId, registeredAt: new Date(), status: "REGISTERED" },
      });
    }
  }

  if (!referralRow) {
    // No valid click record (typed/pasted a ?ref= link directly, or the
    // click token was missing/expired) — still honor the referral code
    // itself, creating the click+registration as a single same-moment event.
    referralRow = await tx.partnerReferral.create({
      data: {
        partnerId: partner.id,
        campaignId: campaignId ?? undefined,
        clickToken: randomUUID(),
        landingPage: input.landingPage ?? undefined,
        ipHash: input.ipHash ?? undefined,
        userAgent: input.userAgent ?? undefined,
        userId,
        registeredAt: new Date(),
        status: "REGISTERED",
      },
    });
  }

  await tx.user.update({
    where: { id: userId },
    data: {
      referredByPartnerId: partner.id,
      referredByCampaignId: campaignId ?? undefined,
      referralCapturedAt: new Date(),
    },
  });

  // Lightweight fraud signal: several registrations from the same hashed IP
  // under the same partner in a short window. Flagged for review, never
  // auto-blocked or auto-deleted.
  if (input.ipHash) {
    const recentSameIp = await tx.partnerReferral.count({
      where: {
        partnerId: partner.id,
        ipHash: input.ipHash,
        status: "REGISTERED",
        registeredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentSameIp >= 3) {
      await tx.partnerFraudFlag.create({
        data: {
          partnerId: partner.id,
          reason: "DUPLICATE_ACCOUNT",
          details: `${recentSameIp} registrations from the same network within 24h.`,
          relatedReferralId: referralRow.id,
        },
      });
    }
  }
}
