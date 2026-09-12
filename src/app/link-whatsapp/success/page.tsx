export default function LinkWhatsAppSuccessPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-success/40 bg-success-surface p-8 text-center">
        <h1 className="text-h2 font-semibold text-success">WhatsApp linked ✅</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Your WhatsApp number is now connected. Head back to WhatsApp to continue.
        </p>
      </div>
    </main>
  );
}
