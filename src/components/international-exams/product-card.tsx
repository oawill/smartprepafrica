import type { ReactNode } from "react";
import type { InternationalExamProduct } from "@prisma/client";
import {
  INTERNATIONAL_EXAM_FEATURES,
  INTERNATIONAL_EXAM_LABELS,
  formatInternationalExamPrice,
} from "@/lib/international-exams/pricing";

/** Shared presentational card for a TOEFL/SAT product — used on both the
 * homepage (CTA links to the existing landing page) and the pricing page
 * (CTA starts checkout), which need identical price/feature display but
 * different calls to action, so the CTA area is passed in rather than
 * hardcoded here. */
export function InternationalExamProductCard({
  product,
  cta,
}: {
  product: InternationalExamProduct;
  cta: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface-raised p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-text-primary">{INTERNATIONAL_EXAM_LABELS[product]}</p>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-text">
          New
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-text-primary">
        {formatInternationalExamPrice(product)}
      </p>
      <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-secondary">
        {INTERNATIONAL_EXAM_FEATURES[product].map((feature) => (
          <li key={feature}>· {feature}</li>
        ))}
      </ul>
      <div className="mt-5">{cta}</div>
    </div>
  );
}
