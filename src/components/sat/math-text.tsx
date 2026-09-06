import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/** Inline KaTeX-capable text for MCQ answer options, which sit inside
 * AnswerOption's <span> — unlike MessageContent (a block <div> with its
 * own forced text color, used for prompts), this renders without a
 * wrapping block element or color override, so option text keeps
 * inheriting AnswerOption's state color (selected/correct/incorrect). */
export function MathText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({ children }) => <>{children}</> }}
    >
      {text}
    </ReactMarkdown>
  );
}
