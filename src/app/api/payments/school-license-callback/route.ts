import { NextRequest, NextResponse } from "next/server";
import { activateSchoolLicensePurchaseForReference } from "@/lib/schools/license-checkout";

/** Separate from /api/payments/callback (the existing subscription
 * checkout's callback route) on purpose — same convention as
 * /api/payments/international-callback — so a failure or change here can
 * never affect the existing subscription payment flow. */
export async function GET(request: NextRequest) {
  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref");

  const baseUrl = request.nextUrl.origin;

  if (!reference) {
    return NextResponse.redirect(`${baseUrl}/dashboard/school?license=error`);
  }

  try {
    const purchase = await activateSchoolLicensePurchaseForReference(reference);
    if (purchase && purchase.status === "SUCCESS") {
      return NextResponse.redirect(`${baseUrl}/dashboard/school?license=success`);
    }
    return NextResponse.redirect(`${baseUrl}/dashboard/school?license=failed`);
  } catch {
    return NextResponse.redirect(`${baseUrl}/dashboard/school?license=error`);
  }
}
