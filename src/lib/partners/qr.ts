import QRCode from "qrcode";

/** Renders a referral link as an inline SVG data URI — no external service
 * call, so it works the same in dev and offline. */
export async function referralQrDataUri(url: string): Promise<string> {
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 240 });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function buildReferralLink(baseUrl: string, referralCode: string, campaignSlug?: string | null) {
  const url = new URL("/join", baseUrl);
  url.searchParams.set("ref", referralCode);
  if (campaignSlug) url.searchParams.set("campaign", campaignSlug);
  return url.toString();
}
