import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface-raised p-5 ${className}`}>
      {title && <h3 className="text-sm font-medium text-text-muted">{title}</h3>}
      <div className={title ? "mt-2" : undefined}>{children}</div>
    </div>
  );
}
