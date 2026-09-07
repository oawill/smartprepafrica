import type { InternationalExamProduct } from "@prisma/client";
import { formatNaira } from "@/lib/plans";

export const INTERNATIONAL_EXAM_PRODUCTS: InternationalExamProduct[] = ["TOEFL", "SAT"];

export const INTERNATIONAL_EXAM_LABELS: Record<InternationalExamProduct, string> = {
  TOEFL: "TOEFL Prep",
  SAT: "SAT Prep",
};

/** Price in kobo (1/100 Naira) — the single source of truth for TOEFL/SAT
 * pricing everywhere it's displayed (homepage, pricing page, landing
 * pages) and everywhere it's charged (checkout). One-time purchases, not
 * recurring monthly plans — kept fully separate from PLAN_PRICING_KOBO
 * in src/lib/plans.ts, which prices the existing local-exam
 * subscriptions and must stay untouched. */
export const INTERNATIONAL_EXAM_PRICING_KOBO: Record<InternationalExamProduct, number> = {
  TOEFL: 3_000_000, // ₦30,000
  SAT: 4_000_000, // ₦40,000
};

export const INTERNATIONAL_EXAM_FEATURES: Record<InternationalExamProduct, string[]> = {
  TOEFL: [
    "Reading practice",
    "Listening practice",
    "Speaking practice",
    "Writing practice",
    "TOEFL-style questions",
    "Full mock examinations",
    "Performance tracking",
    "AI-powered explanations and study support",
  ],
  SAT: [
    "Digital SAT preparation",
    "Reading & Writing",
    "Math",
    "SAT-style practice questions",
    "Full-length mock examinations",
    "Score/performance tracking",
    "AI-powered explanations and study support",
  ],
};

export const INTERNATIONAL_EXAM_LANDING_PATH: Record<InternationalExamProduct, string> = {
  TOEFL: "/international-exams/toefl",
  SAT: "/international-exams/sat",
};

export function formatInternationalExamPrice(product: InternationalExamProduct): string {
  return formatNaira(INTERNATIONAL_EXAM_PRICING_KOBO[product]);
}
