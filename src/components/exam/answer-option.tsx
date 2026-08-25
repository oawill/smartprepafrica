import type { ReactNode } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";

export type AnswerOptionState = "default" | "selected" | "correct" | "incorrect";

const STATE_CLASSES: Record<AnswerOptionState, string> = {
  default: "border-exam-option-border bg-exam-option-bg text-exam-option-text",
  selected: "border-exam-selected-border bg-exam-selected-bg text-exam-selected-text",
  correct: "border-exam-correct-border bg-exam-correct-bg text-exam-correct-text",
  incorrect: "border-exam-incorrect-border bg-exam-incorrect-bg text-exam-incorrect-text",
};

const STATE_LABEL: Partial<Record<AnswerOptionState, string>> = {
  correct: "Correct answer",
  incorrect: "Your answer",
};

/**
 * Single source of truth for how an MCQ option looks across the live
 * exam runner, in-video checkpoints, and the post-attempt review — state
 * is always communicated by icon + text label + color together, never
 * color alone (correct/incorrect answers must stay distinguishable for
 * colorblind students and in grayscale).
 */
export function AnswerOption({
  optionKey,
  children,
  state = "default",
  onClick,
  disabled,
}: {
  optionKey: string;
  children: ReactNode;
  state?: AnswerOptionState;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const label = STATE_LABEL[state];
  const content = (
    <>
      <span className="flex w-full items-start gap-3 text-left">
        <span className="font-semibold text-brand-text">{optionKey}</span>
        <span className="flex-1">{children}</span>
        {state === "correct" && <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-exam-correct-text" />}
        {state === "incorrect" && <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-exam-incorrect-text" />}
      </span>
      {label && <span className="mt-1 block text-xs font-medium">{label}</span>}
    </>
  );

  const className = `flex w-full flex-col rounded-lg border px-4 py-3 text-sm transition ${STATE_CLASSES[state]} ${
    onClick && !disabled ? "hover:border-border-strong" : ""
  }`;

  if (!onClick) {
    return (
      <div className={className} role="listitem">
        {content}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}
