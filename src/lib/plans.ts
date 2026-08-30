import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PREMIUM: "Premium",
  SCHOOL: "School",
};

/** Price in kobo (1/100 Naira). Only plans purchasable via direct checkout. */
export const PLAN_PRICING_KOBO: Partial<Record<SubscriptionPlan, number>> = {
  BASIC: 150_000, // ₦1,500 / month
  PREMIUM: 350_000, // ₦3,500 / month
};

export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  FREE: ["Limited daily practice questions", "Browse course catalog"],
  BASIC: [
    "Full WAEC / NECO / UTME / Post-UTME question bank",
    "Unlimited Study Drills and CBT practice",
    "All courses",
  ],
  PREMIUM: [
    "Everything in Basic",
    "Unlimited mock exams",
    "AI study coach",
    "Certificates & badges",
  ],
  SCHOOL: [
    "Bulk student licenses",
    "Cohort performance dashboard",
    "Dedicated support",
  ],
};

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

/** Resolves a plan's price for a given country: an admin-configured
 * CountryPlanPrice override if one exists, else the hardcoded Nigeria
 * default above — so every existing Nigeria checkout resolves to exactly
 * the same amount/currency it always has, until a country's price is
 * explicitly configured in Admin. */
export async function resolvePlanPrice(
  plan: SubscriptionPlan,
  countryId?: string | null
): Promise<{ amountMinor: number; currency: string } | null> {
  if (countryId) {
    const override = await prisma.countryPlanPrice.findUnique({
      where: { countryId_plan: { countryId, plan } },
    });
    if (override) return { amountMinor: override.priceMinor, currency: override.currency };
  }
  const fallback = PLAN_PRICING_KOBO[plan];
  return fallback ? { amountMinor: fallback, currency: "NGN" } : null;
}

export function formatMoney(amountMinor: number, currency: string): string {
  if (currency === "NGN") return formatNaira(amountMinor);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
