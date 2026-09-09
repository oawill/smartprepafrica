"use server";

import { redirect } from "next/navigation";
import type { SubscriptionPlan, BillingInterval } from "@prisma/client";
import { auth } from "@/lib/auth";
import { initiateSubscriptionCheckout } from "@/lib/subscriptions/checkout";

export async function checkout(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const plan = formData.get("plan") as SubscriptionPlan;
  const interval = (formData.get("interval") as BillingInterval | null) ?? "MONTHLY";

  let authorizationUrl: string;
  try {
    authorizationUrl = await initiateSubscriptionCheckout({
      payerId: session.user.id,
      payerEmail: session.user.email!,
      plan,
      interval,
    });
  } catch {
    redirect("/pricing?status=error");
  }

  redirect(authorizationUrl);
}
