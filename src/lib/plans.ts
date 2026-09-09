import type { SubscriptionPlan, BillingInterval } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PREMIUM: "Premium",
  PRO: "Pro",
  SCHOOL: "School",
};

/** Plan highlighted as the recommended default on the pricing page. */
export const PLAN_MOST_POPULAR: SubscriptionPlan = "PREMIUM";

/** Price in kobo (1/100 Naira) per billing interval. Only plans purchasable
 * via direct checkout. A missing `annual` key means that plan is monthly-only. */
export const PLAN_PRICING_KOBO: Partial<
  Record<SubscriptionPlan, { monthly?: number; annual?: number }>
> = {
  BASIC: { monthly: 250_000 }, // ₦2,500 / month
  PREMIUM: { monthly: 450_000, annual: 4_320_000 }, // ₦4,500/mo, ₦43,200/yr (same 20% annual discount as before)
  PRO: { monthly: 650_000, annual: 6_240_000 }, // ₦6,500/mo, ₦62,400/yr (same 20% annual discount as before)
  // Per-seat price for a school's bulk licence purchase — below BASIC's
  // per-student price as the bulk discount. Monthly-only for now, same as
  // BASIC.
  SCHOOL: { monthly: 200_000 }, // ₦2,000 / seat / month
};

export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  FREE: ["Limited daily practice questions", "Browse course catalog"],
  BASIC: [
    "Full WAEC / NECO / UTME / Post-UTME question bank",
    "Unlimited Study Drills and CBT practice",
    "All courses",
  ],
  PREMIUM: [
    "Full exam practice question bank",
    "WAEC preparation",
    "UTME preparation",
    "Subject practice",
    "Timed CBT mock exams",
    "Detailed answers and explanations",
    "Study guides",
    "Performance analytics",
    "Weak-topic identification",
    "Personalized study recommendations",
    "Progress tracking",
    "50 AI Tutor sessions per month",
    "Group study features where available",
  ],
  PRO: [
    "Everything in Premium",
    "Unlimited AI Tutor sessions*",
    "Priority support",
  ],
  SCHOOL: [
    "Bulk student licenses",
    "Cohort performance dashboard",
    "Dedicated support",
  ],
};

/** Footnote for PRO's "unlimited" claim, shown wherever that feature is listed. */
export const PRO_UNLIMITED_FOOTNOTE =
  "Unlimited AI Tutor sessions are subject to reasonable fair-use, abuse-prevention, and platform security controls.";

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

/** Resolves a plan's price for a given country and billing interval: an
 * admin-configured CountryPlanPrice override if one exists (monthly only —
 * per-interval country pricing isn't configurable via Admin yet), else the
 * hardcoded Nigeria default above — so every existing Nigeria checkout
 * resolves to exactly the same amount/currency it always has, until a
 * country's price is explicitly configured in Admin. */
export async function resolvePlanPrice(
  plan: SubscriptionPlan,
  countryId?: string | null,
  interval: BillingInterval = "MONTHLY"
): Promise<{ amountMinor: number; currency: string } | null> {
  if (interval === "MONTHLY" && countryId) {
    const override = await prisma.countryPlanPrice.findUnique({
      where: { countryId_plan: { countryId, plan } },
    });
    if (override) return { amountMinor: override.priceMinor, currency: override.currency };
  }
  const fallback = PLAN_PRICING_KOBO[plan];
  const amountMinor = interval === "ANNUAL" ? fallback?.annual : fallback?.monthly;
  return amountMinor ? { amountMinor, currency: "NGN" } : null;
}

/** Naira saved per year by choosing the annual price over 12x the monthly
 * price. Returns null if the plan has no annual price configured. */
export function annualSavingsKobo(plan: SubscriptionPlan): number | null {
  const pricing = PLAN_PRICING_KOBO[plan];
  if (!pricing?.monthly || !pricing.annual) return null;
  return pricing.monthly * 12 - pricing.annual;
}

export function formatMoney(amountMinor: number, currency: string): string {
  if (currency === "NGN") return formatNaira(amountMinor);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
