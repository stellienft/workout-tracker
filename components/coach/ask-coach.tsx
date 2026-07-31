"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Sparkles, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { askCoach } from "@/lib/actions/ai-coach";

const SUGGESTED_PROMPTS = [
  "What's a good 5-minute warm-up?",
  "Proper technique for overhead press?",
  "How do I break through a bench press plateau?",
  "Best exercises for building a wider back?",
  "How many rest days should I take between sessions?",
  "What should I eat after a heavy workout?",
  "How do I improve my squat depth?",
  "What's the best way to prevent lower back pain when deadlifting?",
];

interface ChatMsg {
  role: "user" | "coach";
  text: string;
}

export function AskCoach() {
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showPrompts, setShowPrompts] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setShowPrompts(false);
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text }]);

    startTransition(async () => {
      const res = await askCoach(text);
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "coach", text: res.answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "coach", text: res.error ?? "Something went wrong." },
        ]);
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
        <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
        <p className="font-semibold">Ask the AI Coach</p>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          Gym & fitness questions only
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[420px] min-h-[200px] space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && showPrompts && (
          <div>
            <p className="text-sm text-[var(--text-muted)]">Ask me anything about your training, technique, or recovery.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => ask(p)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-active)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  <Clock className="h-3 w-3" />
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length === 0 && !showPrompts && pending && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            Thinking...
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-ink)]"
                  : "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border-subtle)] p-3">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(question);
              }
            }}
            placeholder="Ask me anything about gym or fitness..."
            disabled={pending}
            className="h-11 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none disabled:opacity-50"
          />
          <Button
            onClick={() => ask(question)}
            disabled={pending || !question.trim()}
            size="lg"
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
