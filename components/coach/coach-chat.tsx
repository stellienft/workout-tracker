"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { sendCoachMessage } from "@/lib/actions/trainer";

interface Msg {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function CoachChat({
  tenantId,
  currentUserId,
  messages,
}: {
  tenantId: string;
  currentUserId: string;
  messages: Msg[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [list, setList] = useState<Msg[]>(messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setList(messages), [messages]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [list]);

  function send() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    const optimistic: Msg = {
      id: "temp-" + Date.now(),
      sender_id: currentUserId,
      body: text,
      created_at: new Date().toISOString(),
    };
    setList((prev) => [...prev, optimistic]);
    startTransition(async () => {
      const res = await sendCoachMessage({ tenantId, body: text });
      if (res.ok) {
        router.refresh();
      } else {
        setList((prev) => prev.filter((m) => m.id !== optimistic.id));
        setBody(text);
        toast(res.error ?? "Could not send", "error");
      }
    });
  }

  return (
    <div className="flex h-[440px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {list.length === 0 ? (
          <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
            No messages yet. Say hello to your coach!
          </p>
        ) : (
          list.map((m) => {
            const isMe = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMe
                      ? "bg-[var(--accent-primary)] text-black"
                      : "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
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
            placeholder="Message your coach…"
            className="h-11 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <Button onClick={send} disabled={pending || !body.trim()} size="lg">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
