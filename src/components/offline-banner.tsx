"use client";

import { useOffline } from "next/offline";

/** Renders nothing while online. Backed by next.config.ts's
 * experimental.useOffline flag — the hook listens for real browser
 * offline/online events plus failed-fetch detection (more reliable
 * than a hand-rolled navigator.onLine check), and Next.js itself
 * automatically retries any blocked navigation/prefetch/Server Action
 * once connectivity returns — no retry logic needed here or at any
 * call site. */
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="border-b border-warning/40 bg-warning-surface px-4 py-2 text-center text-sm text-warning"
    >
      You&apos;re offline. We&apos;ll retry automatically once you&apos;re back online.
    </div>
  );
}
