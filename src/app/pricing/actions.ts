"use server";

import { redirect } from "next/navigation";
import type { SubscriptionPlan } from "@prisma/client";
import { auth } from "@/lib/auth";
import { initiateSubscriptionCheckout } from "@/lib/paystack";

export async function checkout(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const plan = formData.get("plan") as SubscriptionPlan;

  let authorizationUrl: string;
  try {
    authorizationUrl = await initiateSubscriptionCheckout({
      payerId: session.user.id,
      payerEmail: session.user.email!,
      plan,
    });
  } catch {
    redirect("/pricing?status=error");
  }

  redirect(authorizationUrl);
}
