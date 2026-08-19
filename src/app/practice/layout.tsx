import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/brand/public-header";

export const metadata: Metadata = {
  title: "Exam Practice | SmartPrepAfrica",
  description: "Practice WAEC, NECO, UTME and Post-UTME questions with SmartPrepAfrica.",
};

export default function PracticeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
