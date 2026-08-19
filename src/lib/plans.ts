import type { SubscriptionPlan } from "@prisma/client";

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
  FREE: ["Limited daily practice questions", "Browse EduCom course catalog"],
  BASIC: [
    "Full WAEC / NECO / UTME / Post-UTME question bank",
    "Unlimited Study Drills and CBT practice",
    "All EduCom courses",
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
