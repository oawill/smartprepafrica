import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FEATURES, PLAN_LABELS, resolvePlanPrice, formatMoney } from "@/lib/plans";
import { checkout } from "@/app/pricing/actions";
import { checkoutInternationalExam } from "@/app/international-exams/checkout-actions";
import { PublicHeader } from "@/components/brand/public-header";
import { Badge } from "@/components/ui/badge";
import { InternationalExamProductCard } from "@/components/international-exams/product-card";
import { INTERNATIONAL_EXAM_PRODUCTS } from "@/lib/international-exams/pricing";
import { isToeflEnabled } from "@/lib/toefl/config";
import { isSatEnabled } from "@/lib/sat/config";

export const metadata: Metadata = {
  title: "Plans & Pricing",
  description:
    "Choose a SmartPrepAfrica.com plan and unlock the full question bank and course library. Also offering TOEFL and SAT preparation for students planning to study abroad.",
};

const orderedPlans = ["FREE", "BASIC", "PREMIUM", "SCHOOL"] as const;

const statusMessages: Record<string, string> = {
  failed: "Your payment didn't go through. Please try again.",
  error: "Something went wrong verifying your payment. Please try again.",
};

export default async function PricingPage({
  searchParams,
}: PageProps<"/pricing">) {
  const { status } = await searchParams;
  const session = await auth();

  const [activeSubscription, viewer, ownedProducts] = await Promise.all([
    session
      ? prisma.subscription.findFirst({
          where: { userId: session.user.id, status: "ACTIVE" },
          orderBy: { startedAt: "desc" },
        })
      : null,
    session
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { countryId: true } })
      : null,
    session
      ? prisma.internationalExamPurchase.findMany({
          where: { userId: session.user.id, status: "SUCCESS" },
          select: { product: true },
        })
      : [],
  ]);
  const ownedProductSet = new Set(ownedProducts.map((p) => p.product));

  const showToefl = isToeflEnabled();
  const showSat = isSatEnabled();
  const showInternationalExams = showToefl || showSat;

  const prices = Object.fromEntries(
    await Promise.all(
      orderedPlans.map(async (plan) => [plan, await resolvePlanPrice(plan, viewer?.countryId)] as const)
    )
  ) as Record<(typeof orderedPlans)[number], { amountMinor: number; currency: string } | null>;

  const statusMessage =
    typeof status === "string" ? statusMessages[status] : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Plans & pricing</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Start free. Upgrade for the full question bank and course library.
      </p>

      {statusMessage && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger-surface px-4 py-2 text-sm text-danger">
          {statusMessage}
        </p>
      )}

      <h2 className="mt-10 text-lg font-semibold text-text-primary">Nigerian Exam Preparation</h2>
      <p className="mt-1 text-sm text-text-secondary">WAEC, NECO, UTME, and Post-UTME practice and courses.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {orderedPlans.map((plan) => {
          const price = prices[plan];
          const isCurrent = activeSubscription?.plan === plan;
          const isFree = plan === "FREE";
          const isSchool = plan === "SCHOOL";

          return (
            <div
              key={plan}
              className="flex flex-col rounded-xl border border-border bg-surface-raised p-5"
            >
              <p className="font-semibold text-brand-text">
                {PLAN_LABELS[plan]}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {price ? formatMoney(price.amountMinor, price.currency) : isFree ? "₦0" : "Custom"}
                {price && (
                  <span className="text-sm font-normal text-text-muted">
                    {" "}
                    / month
                  </span>
                )}
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-secondary">
                {PLAN_FEATURES[plan].map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <div className="flex justify-center">
                    <Badge tone="success">Current plan</Badge>
                  </div>
                ) : isFree ? (
                  <span className="block rounded-full border border-border-strong px-4 py-2 text-center text-sm text-text-secondary">
                    Default plan
                  </span>
                ) : isSchool ? (
                  <Link
                    href="/contact?topic=SCHOOL_REGISTRATION"
                    className="block rounded-full border border-border-strong px-4 py-2 text-center text-sm text-text-primary hover:border-text-muted"
                  >
                    Contact us
                  </Link>
                ) : (
                  <form action={checkout}>
                    <input type="hidden" name="plan" value={plan} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-brand py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                    >
                      Subscribe
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showInternationalExams && (
        <div id="international-exam-prep">
          <h2 className="mt-14 text-lg font-semibold text-text-primary">International Exam Preparation</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Choose the exam you&apos;re preparing for. TOEFL and SAT are separate one-time products, not
            included in the plans above.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {INTERNATIONAL_EXAM_PRODUCTS.filter(
              (product) => (product === "TOEFL" && showToefl) || (product === "SAT" && showSat)
            ).map((product) => (
              <InternationalExamProductCard
                key={product}
                product={product}
                cta={
                  ownedProductSet.has(product) ? (
                    <div className="flex justify-center">
                      <Badge tone="success">Purchased</Badge>
                    </div>
                  ) : (
                    <form action={checkoutInternationalExam}>
                      <input type="hidden" name="product" value={product} />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-brand py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                      >
                        {product === "TOEFL" ? "Start TOEFL Prep" : "Start SAT Prep"}
                      </button>
                    </form>
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-text-muted">
        Payments are processed securely by Paystack. Cards, bank transfer,
        and USSD are supported.
      </p>
    </div>
    </div>
  );
}
