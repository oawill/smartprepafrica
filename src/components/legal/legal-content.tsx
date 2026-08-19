import ReactMarkdown from "react-markdown";

export function LegalContent({ content }: { content: string }) {
  return (
    <div className="legal-markdown text-sm leading-relaxed text-slate-300 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2:first-child]:mt-0 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-orange-400 [&_a]:hover:underline [&_strong]:text-white">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
