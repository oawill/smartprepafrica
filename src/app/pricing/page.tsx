import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICING_KOBO, formatNaira } from "@/lib/plans";
import { checkout } from "@/app/pricing/actions";
import { PublicHeader } from "@/components/brand/public-header";

export const metadata: Metadata = {
  title: "Plans & Pricing",
  description: "Choose a SmartPrepAfrica.com plan and unlock the full question bank and course library.",
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

  const activeSubscription = session
    ? await prisma.subscription.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      })
    : null;

  const statusMessage =
    typeof status === "string" ? statusMessages[status] : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">
        ← Back home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Plans & pricing</h1>
      <p className="mt-2 max-w-2xl text-slate-400">
        Start free. Upgrade for the full question bank and course library.
      </p>

      {statusMessage && (
        <p className="mt-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-2 text-sm text-red-300">
          {statusMessage}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {orderedPlans.map((plan) => {
          const priceKobo = PLAN_PRICING_KOBO[plan];
          const isCurrent = activeSubscription?.plan === plan;
          const isFree = plan === "FREE";
          const isSchool = plan === "SCHOOL";

          return (
            <div
              key={plan}
              className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="font-semibold text-orange-400">
                {PLAN_LABELS[plan]}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {priceKobo ? formatNaira(priceKobo) : isFree ? "₦0" : "Custom"}
                {priceKobo && (
                  <span className="text-sm font-normal text-slate-500">
                    {" "}
                    / month
                  </span>
                )}
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-400">
                {PLAN_FEATURES[plan].map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <span className="block rounded-full border border-green-800 bg-green-900/30 px-4 py-2 text-center text-sm text-green-300">
                    Current plan
                  </span>
                ) : isFree ? (
                  <span className="block rounded-full border border-slate-700 px-4 py-2 text-center text-sm text-slate-400">
                    Default plan
                  </span>
                ) : isSchool ? (
                  <Link
                    href="/contact?topic=SCHOOL_REGISTRATION"
                    className="block rounded-full border border-slate-700 px-4 py-2 text-center text-sm text-slate-200 hover:border-slate-500"
                  >
                    Contact us
                  </Link>
                ) : (
                  <form action={checkout}>
                    <input type="hidden" name="plan" value={plan} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-orange-500 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
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

      <p className="mt-6 text-xs text-slate-500">
        Payments are processed securely by Paystack. Cards, bank transfer,
        and USSD are supported.
      </p>
    </div>
    </div>
  );
}
