"use client";

import { useState } from "react";
import { Card } from "@/components/dashboard/card";

export function ReferralLinkCard({
  referralLink,
  qrDataUri,
}: {
  referralLink: string;
  qrDataUri: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Join Educom and start prepping smarter: ${referralLink}`
  )}`;

  return (
    <Card title="Your referral link">
      <p className="break-all rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-orange-300">
        {referralLink}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Add <code>&campaign=your-campaign-name</code> to track a specific campaign.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-green-800 px-3 py-1.5 text-xs text-green-400 hover:border-green-600"
        >
          Share on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
        >
          {showQr ? "Hide QR code" : "Generate QR code"}
        </button>
      </div>

      {showQr && (
        <div className="mt-3 inline-block rounded-lg border border-slate-800 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUri} alt="Referral link QR code" width={160} height={160} />
        </div>
      )}
    </Card>
  );
}
