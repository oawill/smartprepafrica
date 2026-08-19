import type { ReactNode } from "react";

export function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
