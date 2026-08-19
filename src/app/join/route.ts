import { NextRequest, NextResponse } from "next/server";
import { getPartnerSettings } from "@/lib/partners/settings";
import { hashIp, recordReferralClick } from "@/lib/partners/attribution";

// Public referral entry point: educom.ng/join?ref=EDP00001245&campaign=lagos-schools
// Records the click server-side and sets attribution cookies, then hands off
// to registration. Cookies are a convenience, not the source of truth — the
// ref/campaign/clickToken are also carried forward as URL params so
// attribution survives a cleared cookie jar (see captureAttributionAtRegistration).
export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("ref")?.trim();
  const campaign = request.nextUrl.searchParams.get("campaign")?.trim() || null;
  const intentParam = request.nextUrl.searchParams.get("intent");
  const intent = intentParam === "SCHOOL" ? "SCHOOL" : intentParam === "STUDENT" ? "STUDENT" : null;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/register`);
  }

  const ipHash = hashIp(request.headers.get("x-forwarded-for"));
  const userAgent = request.headers.get("user-agent");

  const result = await recordReferralClick({
    code,
    campaignSlug: campaign,
    landingPage: "/join",
    intent,
    ipHash,
    userAgent,
  });

  if (!result) {
    // Unknown or unapproved code — don't attribute, just send the visitor on.
    return NextResponse.redirect(`${baseUrl}/register`);
  }

  const destination = new URL("/register", baseUrl);
  destination.searchParams.set("ref", result.partner.referralCode!);
  if (campaign) destination.searchParams.set("campaign", campaign);

  const response = NextResponse.redirect(destination);

  const settings = await getPartnerSettings();
  const maxAge = settings.attributionWindowDays * 24 * 60 * 60;

  response.cookies.set("edp_ref", result.partner.referralCode!, { path: "/", maxAge });
  response.cookies.set("edp_click", result.referral.clickToken, { path: "/", maxAge });
  if (campaign) {
    response.cookies.set("edp_campaign", campaign, { path: "/", maxAge });
  }

  return response;
}
