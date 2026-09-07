import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { asOptions } from "@/lib/practice-types";
import type { SatSection } from "@prisma/client";

const SAT_ASK_AI_PROMPTS = [
  "Explain this question",
  "Show me another way to solve it",
  "Why is my answer wrong?",
  "Give me a hint, don't tell me the answer yet",
  "Teach me this concept",
  "Give me a similar question",
];

/** Reuses the existing general-purpose AI Coach (same one WAEC/UTME
 * practice results already launch via focusQuestion) rather than
 * building a second chat system — only the SAT-specific framing
 * (prompt/options text, progressive Math hints) is new. Math questions
 * get progressiveHints so "give me a hint" stages across three
 * escalating hints instead of revealing the answer immediately, per
 * the spec; Reading & Writing does not need that staging. */
export function SatAskAi({
  section,
  domain,
  passage,
  prompt,
  options,
  correctOption,
  correctValue,
  selectedOption,
  numericAnswer,
  explanation,
  triggerLabel = "Ask SmartPrep AI",
}: {
  section: SatSection;
  domain: string;
  passage: string | null;
  prompt: string;
  options: unknown;
  correctOption: string | null;
  correctValue: string | null;
  selectedOption: string | null;
  numericAnswer: string | null;
  explanation: string | null;
  triggerLabel?: string;
}) {
  const isNumeric = correctOption === null;
  const fullPrompt = passage ? `Passage: ${passage}\n\nQuestion: ${prompt}` : prompt;

  let studentAnswer: string | null;
  let correctAnswer: string;
  if (isNumeric) {
    studentAnswer = numericAnswer;
    correctAnswer = correctValue ?? "";
  } else {
    const opts = asOptions(options);
    const find = (key: string | null) => opts.find((o) => o.key === key)?.text ?? "";
    studentAnswer = selectedOption ? `${selectedOption}) ${find(selectedOption)}` : null;
    correctAnswer = `${correctOption}) ${find(correctOption)}`;
  }

  return (
    <AiCoachPanel
      context={{}}
      defaultMode="ASK"
      triggerLabel={triggerLabel}
      triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-brand/50 px-3 py-1.5 text-xs font-medium text-brand-text hover:border-brand"
      suggestedPrompts={SAT_ASK_AI_PROMPTS}
      focusQuestion={{
        prompt: fullPrompt,
        studentAnswer,
        correctAnswer,
        explanation,
        topic: `SAT ${section === "READING_WRITING" ? "Reading and Writing" : "Math"} — ${domain}`,
        progressiveHints: section === "MATH",
      }}
    />
  );
}
