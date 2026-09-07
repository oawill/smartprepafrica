"use server";

import { redirect } from "next/navigation";
import type { InternationalExamProduct } from "@prisma/client";
import { auth } from "@/lib/auth";
import { initiateInternationalExamCheckout } from "@/lib/international-exams/checkout-service";

export async function checkoutInternationalExam(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const product = formData.get("product") as InternationalExamProduct;

  let authorizationUrl: string;
  try {
    authorizationUrl = await initiateInternationalExamCheckout({
      userId: session.user.id,
      userEmail: session.user.email!,
      product,
    });
  } catch {
    redirect("/pricing?status=error");
  }

  redirect(authorizationUrl);
}
