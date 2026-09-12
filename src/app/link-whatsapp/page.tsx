import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLinkTokenPhoneNumber } from "@/lib/whatsapp/linking";
import { confirmLinkWhatsApp } from "@/app/link-whatsapp/actions";

export default async function LinkWhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/");

  const session = await auth();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/link-whatsapp?token=${token}`)}`);
  }

  const phoneNumber = await getLinkTokenPhoneNumber(token);
  if (!phoneNumber) redirect("/link-whatsapp/error?reason=expired");

  const confirmAction = confirmLinkWhatsApp.bind(null, token);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8 text-center">
        <h1 className="text-h2 font-semibold text-text-primary">Link WhatsApp</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Connect WhatsApp number <span className="font-medium text-text-primary">{phoneNumber}</span> to
          your SmartPrepAfrica account, {session.user.name}?
        </p>
        <form action={confirmAction} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover"
          >
            Link my account
          </button>
        </form>
      </div>
    </main>
  );
}
