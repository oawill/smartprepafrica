import { MessageContent } from "@/components/ai-coach/message-content";

/** Renders a scene's equation field (stored as plain LaTeX source, e.g.
 * "HCl + NaOH \\rightarrow NaCl + H_2O") using the same KaTeX pipeline
 * already used for the AI Coach's chat messages — no separate renderer. */
export function EquationDisplay({ equation }: { equation: string }) {
  return <MessageContent content={`$$${equation}$$`} />;
}
