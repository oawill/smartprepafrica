import type { ReactNode } from "react";
import { CheckIcon, FlagIcon, InfoIcon, XIcon } from "@/components/ui/icons";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-border-strong bg-surface-sunken text-text-secondary",
  success: "border-success/30 bg-success-surface text-success",
  warning: "border-warning/30 bg-warning-surface text-warning",
  danger: "border-danger/30 bg-danger-surface text-danger",
  info: "border-info/30 bg-info-surface text-info",
  brand: "border-brand/30 bg-brand/10 text-brand-text",
};

// Every state that isn't purely neutral/brand gets a default icon, so a
// status never relies on color alone (screen readers still get the text).
const DEFAULT_ICON: Partial<Record<BadgeTone, ReactNode>> = {
  success: <CheckIcon className="h-3 w-3" />,
  danger: <XIcon className="h-3 w-3" />,
  warning: <FlagIcon className="h-3 w-3" filled />,
  info: <InfoIcon className="h-3 w-3" />,
};

export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode | null;
  children: ReactNode;
}) {
  const resolvedIcon = icon === null ? null : icon ?? DEFAULT_ICON[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {resolvedIcon}
      {children}
    </span>
  );
}
