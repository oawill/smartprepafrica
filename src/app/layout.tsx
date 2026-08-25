import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | SmartPrepAfrica.com",
    default: "SmartPrepAfrica.com",
  },
  description: "Prepare smarter, pass better, achieve more.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const explicitTheme = cookieStore.get("sp-theme")?.value;
  const dataTheme = explicitTheme === "light" || explicitTheme === "dark" ? explicitTheme : undefined;

  return (
    <html
      lang="en"
      data-theme={dataTheme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface text-text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
