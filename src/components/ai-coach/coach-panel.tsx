"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import type { AiCoachMode } from "@prisma/client";
import {
  startConversation,
  fetchConversations,
  fetchConversationMessages,
  removeConversation,
  submitMessageRating,
} from "@/app/ai-coach/actions";
import { MessageContent } from "@/components/ai-coach/message-content";
import {
  MODE_LABELS,
  QUICK_ACTIONS,
  IM_CONFUSED_LABEL,
  type CoachFocusQuestion,
  type CoachLaunchContext,
  type QuickAction,
} from "@/components/ai-coach/types";

type ConversationSummary = {
  id: string;
  title: string;
  mode: AiCoachMode;
  updatedAt: Date;
};

export function AiCoachPanel({
  context,
  defaultMode = "ASK",
  suggestedPrompts = [
    "What should I study today?",
    "What am I weak at?",
    "Quiz me",
    "Check my exam readiness",
  ],
  focusQuestion,
  triggerLabel = "Ask AI Coach",
  triggerClassName,
  quickActions = QUICK_ACTIONS,
}: {
  context: CoachLaunchContext;
  defaultMode?: AiCoachMode;
  suggestedPrompts?: string[];
  focusQuestion?: CoachFocusQuestion;
  triggerLabel?: string;
  triggerClassName?: string;
  quickActions?: QuickAction[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AiCoachMode>(defaultMode);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [pendingFirstText, setPendingFirstText] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [startError, setStartError] = useState<string | null>(null);

  async function openHistory() {
    setShowHistory(true);
    const list = await fetchConversations();
    setConversations(list);
  }

  async function beginNewConversation(text: string) {
    setStartError(null);
    try {
      const conversation = await startConversation({
        courseId: context.courseId,
        lessonId: context.lessonId,
        mode,
      });
      setInitialMessages(undefined);
      setPendingFirstText(text);
      setActiveConversationId(conversation.id);
      setShowHistory(false);
    } catch {
      setStartError("Couldn't start a new conversation. Please try again.");
    }
  }

  async function resumeConversation(id: string) {
    const rows = await fetchConversationMessages(id);
    setInitialMessages(
      rows.map((m) => ({
        id: m.id,
        role: m.role.toLowerCase() as "user" | "assistant" | "system",
        parts: [{ type: "text", text: m.content }],
      }))
    );
    setPendingFirstText(null);
    setActiveConversationId(id);
    setShowHistory(false);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await removeConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setInitialMessages(undefined);
    }
  }

  function startFresh() {
    setActiveConversationId(null);
    setInitialMessages(undefined);
    setPendingFirstText(null);
    setShowHistory(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        }
      >
        <SparkleIcon /> {triggerLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full flex-col border-l border-border bg-surface sm:w-[440px]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">AI Study Coach</p>
                <p className="text-xs text-text-muted">Ask questions, get explanations, practice problems, and personalized study guidance.</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={openHistory}
                  title="Conversation history"
                  className="rounded-lg p-2 text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                >
                  <HistoryIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  className="rounded-lg p-2 text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
              {(Object.keys(MODE_LABELS) as AiCoachMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    mode === m
                      ? "bg-brand text-brand-foreground"
                      : "border border-border-strong text-text-secondary hover:border-text-muted"
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-4">
                <button
                  type="button"
                  onClick={startFresh}
                  className="mb-3 w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  + New conversation
                </button>
                {conversations.length === 0 ? (
                  <p className="text-sm text-text-muted">No conversations yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {conversations.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => resumeConversation(c.id)}
                          className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-left text-sm hover:border-border-strong"
                        >
                          <span className="truncate text-text-primary">{c.title}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleDelete(c.id, e)}
                            className="ml-2 shrink-0 text-xs text-text-muted hover:text-danger"
                          >
                            Delete
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : activeConversationId ? (
              <ChatBody
                key={activeConversationId}
                conversationId={activeConversationId}
                context={context}
                mode={mode}
                initialMessages={initialMessages}
                initialText={pendingFirstText}
                focusQuestion={focusQuestion}
                quickActions={quickActions}
              />
            ) : (
              <EmptyState
                suggestedPrompts={suggestedPrompts}
                startError={startError}
                onPick={beginNewConversation}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function EmptyState({
  suggestedPrompts,
  startError,
  onPick,
}: {
  suggestedPrompts: string[];
  startError: string | null;
  onPick: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <SparkleIcon large />
      <div>
        <p className="text-lg font-semibold text-text-primary">Meet Your AI Study Coach</p>
        <p className="mt-1 text-sm text-text-secondary">
          Your personal tutor that learns with you. Ask questions, understand difficult topics,
          practice problems, and get personalized guidance based on your learning progress.
        </p>
      </div>
      <div className="grid w-full gap-2">
        {suggestedPrompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="rounded-lg border border-border-strong px-4 py-2.5 text-sm text-text-primary hover:border-brand"
          >
            {p}
          </button>
        ))}
      </div>
      {startError && <p className="text-xs text-danger">{startError}</p>}
      <form
        className="mt-auto flex w-full gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onPick(text.trim());
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask your AI Study Coach…"
          className="flex-1 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatBody({
  conversationId,
  context,
  mode,
  initialMessages,
  initialText,
  focusQuestion,
  quickActions,
}: {
  conversationId: string;
  context: CoachLaunchContext;
  mode: AiCoachMode;
  initialMessages?: UIMessage[];
  initialText: string | null;
  focusQuestion?: CoachFocusQuestion;
  quickActions: QuickAction[];
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  // "I'm Confused" escalation counter — session-scoped (resets on a fresh
  // conversation), incremented only by consecutive "I'm Confused" clicks and
  // reset by any other message, so buildSystemPrompt can pick a genuinely
  // different teaching method each time instead of repeating itself. Sent as
  // per-message metadata (computed synchronously in submitText) rather than
  // baked into the shared transport body, since a value read from state or a
  // ref inside the transport's body would lag a render behind the click that
  // triggered it — and reading a ref directly inside useChat's render-time
  // options object isn't allowed by the refs lint rule anyway.
  const [confusionStage, setConfusionStage] = useState(0);

  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/ai/coach",
      body: {
        conversationId,
        courseId: context.courseId ?? null,
        lessonId: context.lessonId ?? null,
        chapterId: context.chapterId ?? null,
        mode,
        focusQuestion: focusQuestion ?? null,
      },
    }),
  });

  useEffect(() => {
    if (initialText && !sentInitial.current) {
      sentInitial.current = true;
      sendMessage({ text: initialText });
    }
  }, [initialText, sendMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function submitText(text: string, isConfusedClick = false) {
    if (!text.trim() || status === "streaming" || status === "submitted") return;
    const nextStage = isConfusedClick ? confusionStage + 1 : 0;
    setConfusionStage(nextStage);
    sendMessage({ text: text.trim(), metadata: { confusionStage: nextStage } });
    setInput("");
  }

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const text = m.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("\n");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  isUser ? "bg-brand text-brand-foreground" : "bg-surface-raised text-text-primary"
                }`}
              >
                {isUser ? (
                  <p className="text-sm">{text}</p>
                ) : (
                  <>
                    <MessageContent content={text || "…"} />
                    {status === "ready" && text && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                        <button type="button" onClick={() => copyMessage(text)} className="hover:text-text-secondary">
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => submitMessageRating(m.id, 1)}
                          className="hover:text-success"
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          onClick={() => submitMessageRating(m.id, -1)}
                          className="hover:text-danger"
                        >
                          👎
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-surface-raised px-3.5 py-2.5 text-sm text-text-secondary">
              AI Coach is thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger-surface px-3.5 py-2.5 text-sm text-danger">
            <p>{error.message || "Something went wrong. Please try again."}</p>
            <button
              type="button"
              onClick={() => regenerate()}
              className="mt-2 rounded-lg border border-danger/40 px-3 py-1 text-xs hover:border-danger"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              type="button"
              onClick={() => submitText(qa.prompt, qa.label === IM_CONFUSED_LABEL)}
              disabled={isBusy}
              className="shrink-0 rounded-full border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-brand disabled:opacity-50"
            >
              {qa.label}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitText(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitText(input);
              }
            }}
            rows={1}
            placeholder="Ask your AI Study Coach…"
            className="max-h-32 flex-1 resize-none rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="shrink-0 rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function SparkleIcon({ large }: { large?: boolean }) {
  const size = large ? 32 : 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 3v5h5" />
      <path d="M3.05 13a9 9 0 1 0 .5-4.5" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
