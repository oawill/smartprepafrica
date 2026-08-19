import type { ReactNode } from "react";
import { PublicHeader } from "@/components/brand/public-header";

export default function CertificatesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
