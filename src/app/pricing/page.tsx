import type { Metadata } from "next";
import type { BillingInterval, SubscriptionPlan } from "@prisma/client";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_MOST_POPULAR,
  PLAN_PRICING_KOBO,
  PRO_UNLIMITED_FOOTNOTE,
  annualSavingsKobo,
  resolvePlanPrice,
  formatMoney,
} from "@/lib/plans";
import { checkout } from "@/app/pricing/actions";
import { checkoutInternationalExam } from "@/app/international-exams/checkout-actions";
import { PublicHeader } from "@/components/brand/public-header";
import { Badge } from "@/components/ui/badge";
import { InternationalExamProductCard } from "@/components/international-exams/product-card";
import { INTERNATIONAL_EXAM_PRODUCTS } from "@/lib/international-exams/pricing";
import { isToeflEnabled } from "@/lib/toefl/config";
import { isSatEnabled } from "@/lib/sat/config";

export const metadata: Metadata = {
  title: "SmartPrepAfrica Pricing | Exam Prep & Learning Plans",
  description:
    "Explore SmartPrepAfrica plans for WAEC, NECO, UTME/JAMB, SAT, TOEFL and AI-powered learning. Choose the study plan that fits your goals.",
};

const examPrepPlans = ["FREE", "BASIC"] as const;
const premiumPlans = ["PREMIUM", "PRO"] as const;
const orderedPlans = ["FREE", "BASIC", "PREMIUM", "PRO", "SCHOOL"] as const;

const faqs = [
  {
    question: "How does billing work?",
    answer:
      "Subscription plans (Premium and Pro) renew automatically each billing period — monthly or annual, whichever you choose at checkout. TOEFL and SAT are one-time purchases, not subscriptions.",
  },
  {
    question: "What payment methods are supported?",
    answer: "Payments are processed securely by Paystack. Cards, bank transfer, and USSD are supported.",
  },
  {
    question: "What's the difference between Exam Prep and International Exams?",
    answer:
      "Exam Prep and SmartPrepAfrica Premium/Pro are ongoing subscriptions for WAEC, NECO, and UTME/JAMB. TOEFL and SAT Prep are separate, one-time purchases for students preparing to study abroad.",
  },
  {
    question: "Do you offer pricing for schools or institutions?",
    answer:
      "Yes. Schools and institutions get custom pricing based on cohort size — use the \"Talk to Us\" button in the Schools & Institutions section above to reach our team.",
  },
  {
    question: "I have a billing question or need help with my subscription.",
    answer: "Reach our support team directly and we'll help you sort it out.",
  },
];

const statusMessages: Record<string, string> = {
  failed: "Your payment didn't go through. Please try again.",
  error: "Something went wrong verifying your payment. Please try again.",
};

const reasonMessages: Record<string, string> = {
  sat_required: "You need SAT Prep to access that page — purchase it below to continue.",
  toefl_required: "You need TOEFL Prep to access that page — purchase it below to continue.",
  course_subscription_required:
    "You need a Basic, Premium, or Pro subscription to enroll in this course — subscribe below to continue.",
};

export default async function PricingPage({
  searchParams,
}: PageProps<"/pricing">) {
  const { status, billing, reason } = await searchParams;
  const session = await auth();

  const selectedInterval: BillingInterval = billing === "annual" ? "ANNUAL" : "MONTHLY";

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

  // Only Premium/Pro offer annual billing; every other plan always resolves
  // at its monthly price regardless of the page-level toggle.
  const intervalForPlan = (plan: SubscriptionPlan): BillingInterval =>
    PLAN_PRICING_KOBO[plan]?.annual ? selectedInterval : "MONTHLY";

  const prices = Object.fromEntries(
    await Promise.all(
      orderedPlans.map(
        async (plan) =>
          [plan, await resolvePlanPrice(plan, viewer?.countryId, intervalForPlan(plan))] as const
      )
    )
  ) as Record<(typeof orderedPlans)[number], { amountMinor: number; currency: string } | null>;

  const statusMessage =
    typeof status === "string" ? statusMessages[status] : undefined;
  const reasonMessage =
    typeof reason === "string" ? reasonMessages[reason] : undefined;

  function renderPlanCard(plan: (typeof orderedPlans)[number]) {
    const price = prices[plan];
    const interval = intervalForPlan(plan);
    const isCurrent = activeSubscription?.plan === plan;
    const isFree = plan === "FREE";
    const isSchool = plan === "SCHOOL";
    const savings = interval === "ANNUAL" ? annualSavingsKobo(plan) : null;

    return (
      <div
        key={plan}
        className={`flex flex-col rounded-xl border p-5 ${
          plan === PLAN_MOST_POPULAR
            ? "border-brand bg-surface-raised ring-1 ring-brand"
            : "border-border bg-surface-raised"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-brand-text">{PLAN_LABELS[plan]}</p>
          {plan === PLAN_MOST_POPULAR && <Badge tone="brand">Most Popular</Badge>}
        </div>
        <p className="mt-2 text-2xl font-semibold">
          {price ? formatMoney(price.amountMinor, price.currency) : isFree ? "₦0" : "Custom"}
          {price && (
            <span className="text-sm font-normal text-text-muted">
              {" "}
              / {interval === "ANNUAL" ? "year" : "month"}
            </span>
          )}
        </p>
        {savings !== null && savings > 0 && (
          <p className="mt-1 text-xs font-medium text-success">
            Save {formatMoney(savings, "NGN")}/year
          </p>
        )}

        <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-secondary">
          {PLAN_FEATURES[plan].map((feature) => (
            <li key={feature}>· {feature}</li>
          ))}
        </ul>
        {plan === "PRO" && (
          <p className="mt-2 text-xs text-text-muted">*{PRO_UNLIMITED_FOOTNOTE}</p>
        )}

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
              Talk to Us
            </Link>
          ) : (
            <form action={checkout}>
              <input type="hidden" name="plan" value={plan} />
              <input type="hidden" name="interval" value={interval} />
              <button
                type="submit"
                className="w-full rounded-full bg-brand py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Choose {PLAN_LABELS[plan]}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Plans &amp; pricing</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Start free. Upgrade for the full question bank and course library. Every price below is
        billed and charged exactly as shown — no hidden fees.
      </p>

      {statusMessage && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger-surface px-4 py-2 text-sm text-danger">
          {statusMessage}
        </p>
      )}
      {reasonMessage && (
        <p className="mt-4 rounded-lg border border-brand/40 bg-brand/5 px-4 py-2 text-sm text-brand-text">
          {reasonMessage}
        </p>
      )}

      {/* Category 1: Exam Prep */}
      <section id="exam-prep" className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Exam Prep</h2>
        <p className="mt-1 text-sm text-text-secondary">WAEC · NECO · UTME/JAMB practice and courses.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {examPrepPlans.map((plan) => renderPlanCard(plan))}
        </div>
      </section>

      {/* Category 2: International Exams */}
      {showInternationalExams && (
        <section id="international-exam-prep" className="mt-14">
          <h2 className="text-lg font-semibold text-text-primary">International Exams</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Separate, one-time products for students preparing to study abroad — not included in
            the plans above or below.
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
        </section>
      )}

      {/* Category 3: SmartPrepAfrica Premium */}
      <section id="premium" className="mt-14">
        <h2 className="text-lg font-semibold text-text-primary">SmartPrepAfrica Premium</h2>
        <p className="mt-1 text-sm text-text-secondary">
          AI-powered study support on top of your exam prep — billed monthly or annually.
        </p>

        <div className="mt-4 inline-flex rounded-full border border-border-strong p-1 text-sm">
          <Link
            href="/pricing?billing=monthly#premium"
            className={`rounded-full px-4 py-1.5 ${
              selectedInterval === "MONTHLY"
                ? "bg-brand text-brand-foreground"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Monthly
          </Link>
          <Link
            href="/pricing?billing=annual#premium"
            className={`rounded-full px-4 py-1.5 ${
              selectedInterval === "ANNUAL"
                ? "bg-brand text-brand-foreground"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Annual
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {premiumPlans.map((plan) => renderPlanCard(plan))}
        </div>
      </section>

      {/* Category 4: Schools & Institutions */}
      <section id="schools" className="mt-14">
        <h2 className="text-lg font-semibold text-text-primary">Schools &amp; Institutions</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Custom pricing for cohorts and bulk student licenses — talk to our team.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{renderPlanCard("SCHOOL")}</div>
      </section>

      <p className="mt-6 text-xs text-text-muted">
        Payments are processed securely by Paystack. Cards, bank transfer,
        and USSD are supported.
      </p>

      {/* FAQ */}
      <section className="mt-16 border-t border-border pt-10">
        <h2 className="text-lg font-semibold text-text-primary">Frequently asked questions</h2>
        <div className="mt-4 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <p className="font-medium text-text-primary">{faq.question}</p>
              <p className="mt-1 text-sm text-text-secondary">{faq.answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-text-secondary">
          Still have questions?{" "}
          <Link href="/contact?topic=BILLING" className="font-medium text-brand-text hover:underline">
            Contact our team →
          </Link>
        </p>
      </section>
    </div>
    </div>
  );
}
