import { NextRequest, NextResponse } from "next/server";
import { activateSubscriptionForReference } from "@/lib/paystack";

export async function GET(request: NextRequest) {
  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref");

  const baseUrl = request.nextUrl.origin;

  if (!reference) {
    return NextResponse.redirect(`${baseUrl}/pricing?status=error`);
  }

  try {
    const subscription = await activateSubscriptionForReference(reference);
    if (subscription) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/student?payment=success`
      );
    }
    return NextResponse.redirect(`${baseUrl}/pricing?status=failed`);
  } catch {
    return NextResponse.redirect(`${baseUrl}/pricing?status=error`);
  }
}
