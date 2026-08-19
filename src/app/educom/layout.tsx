import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/brand/public-header";

export const metadata: Metadata = {
  title: "Explore Courses | Educom",
  description: "Browse courses from schools and teachers across Nigeria on Educom.",
};

export default function EducomLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
