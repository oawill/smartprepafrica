import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";

export const metadata: Metadata = {
  title: "Become an Educom Partner | Educom",
  description: "Earn commission referring students and schools to Educom.",
};

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
