import { NextRequest, NextResponse } from "next/server";
import { activateInternationalExamPurchaseForReference } from "@/lib/international-exams/checkout-service";

/** Separate from /api/payments/callback (the existing subscription
 * checkout's callback route) on purpose — this is the callback_url set
 * on TOEFL/SAT checkouts specifically, so a failure or change here can
 * never affect the existing subscription payment flow. */
export async function GET(request: NextRequest) {
  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref");

  const baseUrl = request.nextUrl.origin;

  if (!reference) {
    return NextResponse.redirect(`${baseUrl}/pricing?status=error`);
  }

  try {
    const purchase = await activateInternationalExamPurchaseForReference(reference);
    if (purchase && purchase.status === "SUCCESS") {
      const landing =
        purchase.product === "TOEFL" ? "/international-exams/toefl" : "/international-exams/sat";
      return NextResponse.redirect(`${baseUrl}${landing}?purchase=success`);
    }
    return NextResponse.redirect(`${baseUrl}/pricing?status=failed`);
  } catch {
    return NextResponse.redirect(`${baseUrl}/pricing?status=error`);
  }
}
