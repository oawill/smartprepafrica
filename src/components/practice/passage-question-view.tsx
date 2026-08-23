"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionQuestion } from "@/components/practice/session-runner";

export type PassageData = {
  id: string;
  type: string;
  title: string | null;
  instructions: string | null;
  bodyText: string;
  showLineNumbers: boolean;
  startingLineNumber: number;
};

const PASSAGE_TYPE_LABELS: Record<string, string> = {
  COMPREHENSION: "English Comprehension",
  PROSE_EXTRACT: "Prose Extract",
  POETRY: "Poetry",
  DRAMA_EXTRACT: "Drama Extract",
  DIALOGUE: "Dialogue",
  LITERARY_EXTRACT: "Literary Extract",
  OTHER: "Passage",
};

function PassageBody({
  passage,
  highlightStart,
  highlightEnd,
  containerRef,
}: {
  passage: PassageData;
  highlightStart: number | null;
  highlightEnd: number | null;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const highlightRef = useRef<HTMLDivElement>(null);

  // Compute each line's number (only non-blank lines are numbered). Written
  // without mutation — count non-blank lines strictly before this one —
  // since passages are short, the O(n^2) scan is negligible.
  const rawLines = passage.bodyText.split("\n");
  const numberedLines = rawLines.map((line, i) => {
    const isBlank = line.trim() === "";
    const priorNonBlankCount = rawLines.slice(0, i).filter((l) => l.trim() !== "").length;
    const lineNumber = passage.startingLineNumber - 1 + priorNonBlankCount + (isBlank ? 0 : 1);
    return { text: line, isBlank, lineNumber };
  });

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Re-run whenever the highlighted range changes (i.e. a new current question).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightStart, highlightEnd]);

  return (
    <div ref={containerRef} className="prose-passage">
      {passage.title && (
        <h2 className="text-lg font-semibold text-slate-100">{passage.title}</h2>
      )}
      {passage.instructions && (
        <p className="mt-2 text-sm italic text-slate-400">{passage.instructions}</p>
      )}
      <div className="mt-4 space-y-3 text-base leading-8 text-slate-200">
        {numberedLines.map(({ text: line, isBlank, lineNumber: thisLineNumber }, i) => {
          const isHighlighted =
            !isBlank &&
            highlightStart !== null &&
            thisLineNumber >= highlightStart &&
            thisLineNumber <= (highlightEnd ?? highlightStart);

          if (isBlank) return <div key={i} className="h-2" aria-hidden="true" />;

          return (
            <div
              key={i}
              ref={isHighlighted && thisLineNumber === highlightStart ? highlightRef : undefined}
              className={`flex gap-3 rounded px-2 py-0.5 -mx-2 ${
                isHighlighted ? "bg-orange-500/15 ring-1 ring-orange-500/40" : ""
              }`}
            >
              {passage.showLineNumbers && (
                <span className="mt-0.5 w-6 shrink-0 select-none text-right text-xs text-slate-600">
                  {thisLineNumber}
                </span>
              )}
              <p className="flex-1">{line}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PassageQuestionNav({
  members,
  currentQuestionId,
  answers,
  flags,
  onSelect,
}: {
  members: SessionQuestion[];
  currentQuestionId: string;
  answers: Record<string, string | null>;
  flags: Record<string, boolean>;
  onSelect: (questionId: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Questions for this passage
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {members.map((m, i) => {
          const isCurrent = m.questionId === currentQuestionId;
          const isAnswered = !!answers[m.questionId];
          const isFlagged = !!flags[m.questionId];
          return (
            <button
              key={m.questionId}
              type="button"
              onClick={() => onSelect(m.questionId)}
              aria-current={isCurrent}
              className={`relative flex h-8 w-8 items-center justify-center rounded text-xs font-medium ${
                isCurrent
                  ? "bg-orange-500 text-slate-950"
                  : isAnswered
                    ? "bg-green-900 text-green-300"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              {i + 1}
              {isFlagged && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PassageQuestionView({
  passage,
  questions,
  currentQuestion,
  answers,
  flags,
  onNavigate,
  answerPanel,
}: {
  passage: PassageData;
  questions: SessionQuestion[];
  currentQuestion: SessionQuestion;
  answers: Record<string, string | null>;
  flags: Record<string, boolean>;
  onNavigate: (globalIndex: number) => void;
  answerPanel: React.ReactNode;
}) {
  const members = questions.filter((q) => q.passageGroupId === currentQuestion.passageGroupId);
  const scrollPositions = useRef<Record<string, number>>({});
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function selectMember(questionId: string) {
    const i = questions.findIndex((q) => q.questionId === questionId);
    if (i >= 0) onNavigate(i);
  }

  function closeDrawer() {
    if (mobileContainerRef.current) {
      scrollPositions.current[passage.id] = mobileContainerRef.current.scrollTop;
    }
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (drawerOpen && mobileContainerRef.current) {
      mobileContainerRef.current.scrollTop = scrollPositions.current[passage.id] ?? 0;
    }
    // Restore this passage's saved scroll position each time its drawer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, passage.id]);

  const typeLabel = PASSAGE_TYPE_LABELS[passage.type] ?? passage.type;

  return (
    <div className="flex-1">
      {/* Desktop split-screen (lg+): passage panel needs real width, so this
          feature treats sm..lg as "mobile" even though the standalone view's
          palette already shows at sm. */}
      <div className="hidden gap-8 lg:flex">
        <aside className="w-[26rem] shrink-0">
          <span className="inline-block rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            {typeLabel}
          </span>
          <div className="mt-4 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <PassageBody
              passage={passage}
              highlightStart={currentQuestion.passageLineStart}
              highlightEnd={currentQuestion.passageLineEnd}
            />
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <PassageQuestionNav
              members={members}
              currentQuestionId={currentQuestion.questionId}
              answers={answers}
              flags={flags}
              onSelect={selectMember}
            />
          </div>
          {answerPanel}
        </div>
      </div>

      {/* Mobile / tablet (<lg): passage collapses behind a persistent toggle. */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            {typeLabel}
            {passage.title ? ` · ${passage.title}` : ""}
          </span>
          <button
            type="button"
            onClick={() => (drawerOpen ? closeDrawer() : setDrawerOpen(true))}
            className="shrink-0 rounded-full bg-orange-500 px-4 py-1.5 text-xs font-medium text-slate-950 hover:bg-orange-400"
          >
            {drawerOpen ? "Hide Passage" : "View Passage"}
          </button>
        </div>

        {drawerOpen && (
          <div
            ref={mobileContainerRef}
            className="mt-3 max-h-[50vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <PassageBody
              passage={passage}
              highlightStart={currentQuestion.passageLineStart}
              highlightEnd={currentQuestion.passageLineEnd}
            />
            <button
              type="button"
              onClick={closeDrawer}
              className="mt-4 w-full rounded-full border border-slate-700 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Return to question
            </button>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <PassageQuestionNav
            members={members}
            currentQuestionId={currentQuestion.questionId}
            answers={answers}
            flags={flags}
            onSelect={selectMember}
          />
        </div>

        <div className="mt-6">{answerPanel}</div>
      </div>
    </div>
  );
}
