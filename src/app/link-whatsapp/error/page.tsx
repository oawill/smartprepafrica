const REASON_MESSAGES: Record<string, string> = {
  expired: "This link has expired or was already used. Message SmartPrepAfrica on WhatsApp again to get a fresh link.",
  "already-linked": "This WhatsApp number is already linked to a different SmartPrepAfrica account.",
};

export default async function LinkWhatsAppErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = REASON_MESSAGES[reason ?? ""] ?? "Something went wrong linking your WhatsApp number.";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-danger/40 bg-surface-raised p-8 text-center">
        <h1 className="text-h2 font-semibold text-danger">Couldn&apos;t link WhatsApp</h1>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
      </div>
    </main>
  );
}
