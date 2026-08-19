import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";

export const metadata: Metadata = {
  title: "Log In or Sign Up | Educom",
  description: "Log in or create your Educom account to start learning.",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
