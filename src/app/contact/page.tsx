import type { Metadata } from "next";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { ContactForm } from "@/components/contact/contact-form";
import { getPlatformSettings } from "@/lib/legal/settings";

export const metadata: Metadata = {
  title: "Contact Us | Educom",
  description: "Get in touch with the Educom team — we're here to help.",
};

export default async function ContactPage() {
  const settings = await getPlatformSettings();
  const hasContactInfo =
    settings.supportEmail || settings.supportPhone || settings.companyAddress || settings.supportHours;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-3xl font-semibold">Contact Us</h1>
          <p className="mt-2 text-slate-400">Need help? Our team is here to assist.</p>

          {hasContactInfo && (
            <div className="mt-6 grid gap-2 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300 sm:grid-cols-2">
              {settings.supportEmail && (
                <p>
                  <span className="text-slate-500">Email:</span> {settings.supportEmail}
                </p>
              )}
              {settings.supportPhone && (
                <p>
                  <span className="text-slate-500">Phone:</span> {settings.supportPhone}
                </p>
              )}
              {settings.companyAddress && (
                <p className="sm:col-span-2">
                  <span className="text-slate-500">Address:</span> {settings.companyAddress}
                </p>
              )}
              {settings.supportHours && (
                <p className="sm:col-span-2">
                  <span className="text-slate-500">Support Hours:</span> {settings.supportHours}
                </p>
              )}
            </div>
          )}

          <ContactForm />
        </section>
      </main>

      <Footer />
    </div>
  );
}
