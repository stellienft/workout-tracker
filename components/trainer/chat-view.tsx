"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { sendMessage } from "@/lib/actions/trainer";
import { useRouter } from "next/navigation";

interface Thread {
  id: string;
  client_id: string;
  last_message_at: string | null;
  created_at: string;
  client: { email: string; full_name: string | null } | null;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export function ChatView({
  threads,
  messages,
  activeThreadId,
  currentUserId,
}: {
  threads: Thread[];
  messages: Message[];
  activeThreadId?: string;
  currentUserId: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [messageList, setMessageList] = useState(messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessageList(messages);
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messageList]);

  function send() {
    if (!body.trim() || !activeThreadId) return;
    const bodyText = body;
    setBody("");
    startTransition(async () => {
      // Optimistic
      const optimistic: Message = {
        id: "temp-" + Date.now(),
        thread_id: activeThreadId,
        sender_id: currentUserId,
        body: bodyText,
        created_at: new Date().toISOString(),
        read_at: null,
      };
      setMessageList((prev) => [...prev, optimistic]);

      const res = await sendMessage({ threadId: activeThreadId, body: bodyText });
      if (!res.ok) {
        toast(res.error ?? "Could not send", "error");
        setMessageList((prev) => prev.filter((m) => m.id !== optimistic.id));
        setBody(bodyText);
      } else {
        router.refresh();
      }
    });
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          No conversations yet. Go to Clients and tap Message to start a chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden h-[600px]">
      {/* Thread list */}
      <div className="w-64 shrink-0 border-r border-[var(--border-subtle)] overflow-y-auto">
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => router.push(`/trainer/chat?thread=${t.id}`)}
            className={`flex w-full items-center gap-2 border-b border-[var(--border-subtle)] p-3 text-left text-sm ${
              activeThreadId === t.id
                ? "bg-[var(--accent-muted)]"
                : "hover:bg-[var(--surface-secondary)]"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent-primary)]">
              {(t.client?.full_name || t.client?.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {t.client?.full_name || "Unknown"}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {t.client?.email}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col min-w-0">
        {activeThreadId ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messageList.length === 0 && (
                <p className="text-center text-sm text-[var(--text-muted)] mt-8">
                  No messages yet. Say hello!
                </p>
              )}
              {messageList.map((m) => {
                const isMe = m.sender_id === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                        isMe
                          ? "bg-[var(--accent-primary)] text-black"
                          : "bg-[var(--surface-secondary)] text-white"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-[var(--border-subtle)] p-3">
              <div className="flex gap-2">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message…"
                  className="h-11 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
                />
                <Button onClick={send} disabled={pending || !body.trim()} size="lg">
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
